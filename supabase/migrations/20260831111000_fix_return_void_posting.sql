-- Correct the return void posting direction and make the function idempotent-safe.
create or replace function public.void_return_voucher(p_return_id uuid)
returns public.return_vouchers
language plpgsql security definer set search_path=public as $$
declare
  v public.return_vouchers;
  v_user uuid := auth.uid();
  v_party_account uuid;
  v_account uuid;
  v_journal uuid;
  r record;
begin
  select * into v
  from public.return_vouchers
  where id=p_return_id and business_id=public.current_business_id()
  for update;
  if not found or v.status<>'completed' then raise exception 'Only completed return vouchers can be voided'; end if;
  if not public.has_permission(case when v.return_type='sale_return' then 'sales.manage' else 'purchase.manage' end) then raise exception 'Return permission required'; end if;

  for r in select product_id,quantity from public.return_voucher_items where return_id=v.id loop
    if v.return_type='sale_return' then
      perform public.apply_stock_movement(r.product_id,v.business_id,-r.quantity,'sale_return_void','return',v.id,'Sale return voided');
    else
      perform public.apply_stock_movement(r.product_id,v.business_id,r.quantity,'purchase_return_void','return',v.id,'Purchase return voided');
    end if;
  end loop;

  select id into v_party_account from public.accounts where business_id=v.business_id and party_id=v.party_id and is_active limit 1;
  select id into v_account from public.accounts where business_id=v.business_id and account_code=case when v.return_type='sale_return' then 'SYS_SALES_RETURN' else 'SYS_PURCHASE_RETURN' end and is_active limit 1;
  if v_party_account is null or v_account is null then raise exception 'Required accounting account is missing for this party/return'; end if;

  if v.return_type='sale_return' then
    -- Original: Dr Sales Return / Cr Party. Void reverses it.
    v_journal := public.post_accounting_entry(v.business_id,'sale_return_void',v.return_no||'-VOID',v.return_date::timestamptz,'Void Sale Return '||v.return_no,'return_void',v.id,v_user,v_party_account,v_account,v.grand_total,v.party_id);
  else
    -- Original: Dr Party / Cr Purchase Return. Void reverses it.
    v_journal := public.post_accounting_entry(v.business_id,'purchase_return_void',v.return_no||'-VOID',v.return_date::timestamptz,'Void Purchase Return '||v.return_no,'return_void',v.id,v_user,v_account,v_party_account,v.grand_total,v.party_id);
  end if;

  update public.return_vouchers set status='void',void_journal_entry_id=v_journal,updated_at=now() where id=v.id returning * into v;
  return v;
end;
$$;
grant execute on function public.void_return_voucher(uuid) to authenticated;
