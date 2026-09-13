-- Atomic, business-scoped deletion for draft purchase/sale vouchers.
-- Posted vouchers remain protected and must use their reversal/void workflow.
create or replace function public.bulk_soft_delete_draft_invoices(
  p_kind text,
  p_invoice_ids uuid[],
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid;
  v_role text;
  v_found integer := 0;
  v_total integer := coalesce(array_length(p_invoice_ids, 1), 0);
  v_id uuid;
  v_reason text := left(nullif(trim(coalesce(p_reason, '')), ''), 500);
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_kind not in ('purchase', 'sale') then
    raise exception 'Invalid voucher type';
  end if;

  if v_total < 1 or v_total > 50 then
    raise exception 'Select between 1 and 50 vouchers';
  end if;

  select business_id, role
    into v_business_id, v_role
    from public.profiles
   where id = v_user_id
     and is_active = true;

  if v_business_id is null then
    raise exception 'Unauthorized';
  end if;

  if v_role not in ('admin', 'staff') then
    raise exception 'Only admin or staff can delete draft vouchers';
  end if;

  if p_kind = 'purchase' then
    select count(*) into v_found
      from public.purchase_invoices
     where business_id = v_business_id
       and deleted_at is null
       and id = any(p_invoice_ids)
       and status = 'draft';
  else
    select count(*) into v_found
      from public.sales_invoices
     where business_id = v_business_id
       and deleted_at is null
       and id = any(p_invoice_ids)
       and status = 'draft';
  end if;

  if v_found <> v_total then
    raise exception 'Only active draft vouchers can be deleted';
  end if;

  -- All validation happens before the first mutation. Any exception raised by
  -- an underlying delete RPC aborts the whole database transaction, preventing
  -- partial bulk deletion.
  foreach v_id in array p_invoice_ids loop
    if p_kind = 'purchase' then
      perform public.soft_delete_purchase_invoice(
        p_invoice_id => v_id,
        p_reason => coalesce(v_reason, 'Draft purchase deleted')
      );
    else
      perform public.soft_delete_sale_invoice(
        p_invoice_id => v_id,
        p_reason => coalesce(v_reason, 'Draft sale deleted')
      );
    end if;
  end loop;

  return jsonb_build_object(
    'deleted', v_total,
    'kind', p_kind
  );
end;
$$;

revoke all on function public.bulk_soft_delete_draft_invoices(text, uuid[], text) from public;
grant execute on function public.bulk_soft_delete_draft_invoices(text, uuid[], text) to authenticated;
