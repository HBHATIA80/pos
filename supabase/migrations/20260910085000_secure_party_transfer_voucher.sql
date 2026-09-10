create or replace function public.record_party_transfer_voucher(
  p_voucher_type text,
  p_source_party_id uuid,
  p_destination_party_id uuid,
  p_amount numeric,
  p_reference_no text default null,
  p_notes text default null,
  p_paid_at timestamptz default now()
) returns public.account_vouchers
language plpgsql
security definer
set search_path=public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
  v_source public.parties;
  v_destination public.parties;
  v_source_account uuid;
  v_destination_account uuid;
  v_voucher public.account_vouchers;
  v_entry_id uuid;
  v_voucher_no text;
begin
  if v_business_id is null or v_user_id is null then raise exception 'Unauthorized'; end if;
  if not public.has_permission('payments.manage') then raise exception 'Payment permission required'; end if;
  if p_voucher_type not in ('receipt','payment') then raise exception 'Invalid voucher type'; end if;
  if p_source_party_id is null or p_destination_party_id is null then raise exception 'Both source and destination parties are required'; end if;
  if p_source_party_id = p_destination_party_id then raise exception 'Source and destination parties must be different'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Transfer amount must be greater than zero'; end if;
  select * into v_source from public.parties where id=p_source_party_id and business_id=v_business_id and is_active=true;
  if not found then raise exception 'Source party not found or inactive'; end if;
  select * into v_destination from public.parties where id=p_destination_party_id and business_id=v_business_id and is_active=true;
  if not found then raise exception 'Destination party not found or inactive'; end if;
  select id into v_source_account from public.accounts where business_id=v_business_id and party_id=p_source_party_id and is_active=true limit 1;
  select id into v_destination_account from public.accounts where business_id=v_business_id and party_id=p_destination_party_id and is_active=true limit 1;
  if v_source_account is null then raise exception 'Source party ledger account is missing'; end if;
  if v_destination_account is null then raise exception 'Destination party ledger account is missing'; end if;
  insert into public.account_vouchers(business_id,voucher_type,party_id,destination_party_id,payment_method,account_name,amount,reference_no,notes,paid_at,status,created_by)
  values(v_business_id,p_voucher_type,p_source_party_id,p_destination_party_id,'party_transfer','Party Transfer',round(p_amount,2),nullif(trim(p_reference_no),''),concat_ws(' · ','Transfer from '||v_source.name||' to '||v_destination.name,nullif(trim(p_notes),'')),coalesce(p_paid_at,now()),'active',v_user_id)
  returning * into v_voucher;
  v_voucher_no := 'TR-'||upper(substr(replace(v_voucher.id::text,'-',''),1,10));
  insert into public.journal_entries(business_id,voucher_type,voucher_no,entry_date,narration,reference_type,reference_id,status,created_by)
  values(v_business_id,p_voucher_type,v_voucher_no,coalesce(p_paid_at,now()),concat_ws(' · ','Party to party transfer',v_source.name||' → '||v_destination.name,nullif(trim(p_notes),'')),'account_voucher',v_voucher.id,'posted',v_user_id)
  returning id into v_entry_id;
  insert into public.journal_lines(journal_entry_id,business_id,account_id,party_id,debit,credit,narration) values
    (v_entry_id,v_business_id,v_destination_account,p_destination_party_id,round(p_amount,2),0,'Party transfer received from '||v_source.name),
    (v_entry_id,v_business_id,v_source_account,p_source_party_id,0,round(p_amount,2),'Party transfer paid to '||v_destination.name);
  return v_voucher;
end;
$$;
grant execute on function public.record_party_transfer_voucher(text,uuid,uuid,numeric,text,text,timestamptz) to authenticated;
