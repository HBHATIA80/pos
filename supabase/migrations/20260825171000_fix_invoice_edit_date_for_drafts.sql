do $$
declare
  v_sql text;
begin
  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'edit_transaction_invoice'
    and pg_get_function_identity_arguments(p.oid) = 'p_kind text, p_invoice_id uuid, p_payload jsonb';

  if v_sql is null then
    raise exception 'edit_transaction_invoice function not found';
  end if;

  v_sql := replace(
    v_sql,
    'sold_at=case when v_status=''completed'' then v_date else sold_at end',
    'sold_at=v_date'
  );

  v_sql := replace(
    v_sql,
    'purchased_at=case when v_status=''completed'' then v_date else purchased_at end',
    'purchased_at=v_date'
  );

  execute v_sql;
end $$;
