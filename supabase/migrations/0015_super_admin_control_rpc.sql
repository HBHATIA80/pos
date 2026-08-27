create or replace function public.get_platform_control_center()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
  v_user uuid := auth.uid();
begin
  if v_user is null or not exists (select 1 from public.platform_super_admins where user_id = v_user) then
    raise exception 'Super admin access required.' using errcode = '42501';
  end if;

  with shop_base as (
    select b.*,
      (select jsonb_build_object('id',p.id,'full_name',p.full_name,'phone',p.phone,'role',p.role,'is_active',p.is_active)
       from public.profiles p where p.business_id=b.id and p.role='admin' order by p.created_at asc limit 1) as owner,
      (select count(*) from public.profiles p where p.business_id=b.id) as users,
      (select count(*) from public.profiles p where p.business_id=b.id and p.is_active) as active_users,
      (select count(*) from public.customer_business_memberships m where m.business_id=b.id and m.is_active) as customers,
      (select count(*) from public.products p where p.business_id=b.id) as products,
      (select count(*) from public.products p where p.business_id=b.id and p.is_active and coalesce(p.current_stock,0) <= coalesce(p.reorder_level,0)) as low_stock,
      (select count(*) from public.sales_invoices s where s.business_id=b.id and s.deleted_at is null) as sales_count,
      (select coalesce(sum(s.grand_total),0) from public.sales_invoices s where s.business_id=b.id and s.deleted_at is null) as sales_total,
      (select count(*) from public.purchase_invoices p where p.business_id=b.id) as purchase_count,
      (select coalesce(sum(p.grand_total),0) from public.purchase_invoices p where p.business_id=b.id) as purchase_total,
      (select coalesce(sum(e.amount),0) from public.expenses e where e.business_id=b.id) as expense_total
    from public.businesses b
  ), metrics as (
    select
      (select count(*) from public.businesses) as shops,
      (select count(*) from public.businesses where status='active') as active_shops,
      (select count(*) from public.profiles) as users,
      (select count(*) from public.profiles where is_active) as active_users,
      (select count(*) from public.profiles where role='user') as customers,
      (select count(*) from public.profiles where role='admin') as admins,
      (select count(*) from public.profiles where role='staff') as staff,
      (select count(*) from public.products) as products,
      (select count(*) from public.products where is_active and coalesce(current_stock,0) <= coalesce(reorder_level,0)) as low_stock,
      (select count(*) from public.sales_invoices where deleted_at is null) as sales_count,
      (select coalesce(sum(grand_total),0) from public.sales_invoices where deleted_at is null) as sales_total,
      (select count(*) from public.purchase_invoices) as purchase_count,
      (select coalesce(sum(grand_total),0) from public.purchase_invoices) as purchase_total,
      (select coalesce(sum(amount),0) from public.expenses) as expense_total,
      (select count(*) from public.customer_business_memberships where is_active) as customer_memberships
  )
  select jsonb_build_object(
    'generatedAt', now(),
    'metrics', (select jsonb_build_object(
      'shops',shops,'activeShops',active_shops,'inactiveShops',shops-active_shops,'users',users,'activeUsers',active_users,
      'customers',customers,'admins',admins,'staff',staff,'products',products,'lowStock',low_stock,
      'salesCount',sales_count,'salesTotal',sales_total,'purchaseCount',purchase_count,'purchaseTotal',purchase_total,
      'expenseTotal',expense_total,'netAfterExpenses',sales_total-purchase_total-expense_total,'customerMemberships',customer_memberships
    ) from metrics),
    'shops', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from shop_base s),'[]'::jsonb),
    'users', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.profiles p),'[]'::jsonb),
    'recentActivity', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select id,business_id,actor_id,action,entity_type,entity_id,metadata,created_at from public.audit_logs order by created_at desc limit 100) a),'[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.control_platform_entity(p_action text, p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_active boolean;
  v_business_id uuid;
  v_name text;
  v_status text;
begin
  if v_user is null or not exists (select 1 from public.platform_super_admins where user_id = v_user) then
    raise exception 'Super admin access required.' using errcode = '42501';
  end if;
  if p_action not in ('activate_shop','deactivate_shop','activate_user','deactivate_user') then
    raise exception 'Invalid control action.' using errcode = '22023';
  end if;

  if p_action in ('activate_shop','deactivate_shop') then
    v_active := p_action='activate_shop';
    update public.businesses set status=case when v_active then 'active' else 'inactive' end, updated_at=now()
      where id=p_target_id returning id,name,status into v_business_id,v_name,v_status;
    if v_business_id is null then raise exception 'Shop not found.' using errcode='P0002'; end if;
    insert into public.audit_logs(business_id,actor_id,action,entity_type,entity_id,metadata)
      values(v_business_id,v_user,case when v_active then 'platform.shop_active' else 'platform.shop_inactive' end,'business',p_target_id,jsonb_build_object('source','super_admin_portal'));
    return jsonb_build_object('message',case when v_active then 'Shop active.' else 'Shop inactive.' end,'shop',jsonb_build_object('id',v_business_id,'name',v_name,'status',v_status));
  end if;

  if exists(select 1 from public.platform_super_admins where user_id=p_target_id) then
    raise exception 'Platform super admin accounts cannot be deactivated from this control.' using errcode='42501';
  end if;
  v_active := p_action='activate_user';
  update public.profiles set is_active=v_active, updated_at=now()
    where id=p_target_id returning id,full_name,business_id into v_business_id,v_name,v_status;
  if v_business_id is null then raise exception 'User not found.' using errcode='P0002'; end if;
  insert into public.audit_logs(business_id,actor_id,action,entity_type,entity_id,metadata)
    values(v_status::uuid,v_user,case when v_active then 'platform.user_activated' else 'platform.user_deactivated' end,'profile',p_target_id,jsonb_build_object('source','super_admin_portal'));
  return jsonb_build_object('message',case when v_active then 'User activated.' else 'User deactivated.' end);
end;
$$;

revoke all on function public.get_platform_control_center() from public;
grant execute on function public.get_platform_control_center() to authenticated;
revoke all on function public.control_platform_entity(text,uuid) from public;
grant execute on function public.control_platform_entity(text,uuid) to authenticated;
