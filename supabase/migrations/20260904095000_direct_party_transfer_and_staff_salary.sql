alter table public.parties add column if not exists is_staff boolean not null default false;
alter table public.sale_payments add column if not exists destination_party_id uuid references public.parties(id) on delete restrict;
create index if not exists parties_business_staff_active_idx on public.parties (business_id, is_staff, is_active, name);
create index if not exists sale_payments_destination_party_idx on public.sale_payments (business_id, destination_party_id, paid_at) where destination_party_id is not null and status = 'active';
comment on column public.parties.is_staff is 'Marks an internal employee ledger party; staff parties are excluded from customer/supplier POS search.';
comment on column public.sale_payments.destination_party_id is 'For a direct customer payment to another party, identifies the party who receives the amount without passing through shop cash/bank.';

do $$
declare r record; v_party_id uuid;
begin
  for r in select p.id,p.business_id,p.full_name,p.phone from public.profiles p where p.role='staff' and p.business_id is not null and p.is_active=true and p.party_id is null loop
    select id into v_party_id from public.parties where business_id=r.business_id and lower(trim(party_code))=lower('STF-'||upper(substr(replace(r.id::text,'-',''),1,8))) limit 1;
    if v_party_id is null then
      insert into public.parties(business_id,party_code,party_type,name,phone,opening_balance,opening_balance_type,credit_limit,notes,is_active,is_staff,created_by)
      values(r.business_id,'STF-'||upper(substr(replace(r.id::text,'-',''),1,8)),'supplier',r.full_name,r.phone,0,'none',0,'Internal staff ledger account',true,true,null)
      returning id into v_party_id;
    else
      update public.parties set name=r.full_name,phone=r.phone,is_staff=true,is_active=true where id=v_party_id;
    end if;
    update public.profiles set party_id=v_party_id where id=r.id;
  end loop;
end $$;

create or replace function public.record_sale_payment_to_party(p_invoice_id uuid,p_destination_party_id uuid,p_amount numeric,p_reference_no text default null,p_notes text default null,p_paid_at timestamptz default now()) returns public.sale_payments language plpgsql security definer set search_path=public as $$
declare v_business_id uuid:=public.current_business_id(); v_user_id uuid:=auth.uid(); v_invoice public.sales_invoices; v_destination public.parties; v_source_account uuid; v_destination_account uuid; v_existing_paid numeric(14,2); v_balance numeric(14,2); v_payment public.sale_payments; v_transfer_voucher public.account_vouchers; v_entry_id uuid; v_voucher_no text;
begin
 if v_business_id is null or v_user_id is null then raise exception 'Unauthorized'; end if;
 if not public.has_permission('sales.manage') then raise exception 'Sales permission required'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Payment amount must be greater than zero'; end if;
 select * into v_invoice from public.sales_invoices where id=p_invoice_id and business_id=v_business_id for update;
 if not found then raise exception 'Invoice not found'; end if;
 if v_invoice.status<>'completed' then raise exception 'Only completed invoices can receive payments'; end if;
 if v_invoice.party_id is null then raise exception 'Direct transfer requires a named customer on the invoice'; end if;
 if v_invoice.party_id=p_destination_party_id then raise exception 'Transfer party must be different from the customer'; end if;
 select * into v_destination from public.parties where id=p_destination_party_id and business_id=v_business_id and is_active=true;
 if not found then raise exception 'Transfer party not found or inactive'; end if;
 select coalesce(sum(amount),0) into v_existing_paid from public.sale_payments where invoice_id=p_invoice_id and business_id=v_business_id and status='active';
 v_balance:=round(v_invoice.grand_total-v_existing_paid,2);
 if v_balance<=0 then raise exception 'Invoice is already fully paid'; end if;
 if p_amount>v_balance then raise exception 'Payment exceeds outstanding balance of %',to_char(v_balance,'FM999999999990.00'); end if;
 select id into v_source_account from public.accounts where business_id=v_business_id and party_id=v_invoice.party_id and is_active=true limit 1;
 select id into v_destination_account from public.accounts where business_id=v_business_id and party_id=p_destination_party_id and is_active=true limit 1;
 if v_source_account is null then raise exception 'Customer ledger account is missing'; end if;
 if v_destination_account is null then raise exception 'Transfer party ledger account is missing'; end if;
 insert into public.sale_payments(business_id,invoice_id,party_id,payment_method,amount,reference_no,notes,paid_at,status,created_by,destination_party_id) values(v_business_id,v_invoice.id,v_invoice.party_id,'party_transfer',round(p_amount,2),nullif(trim(p_reference_no),''),concat_ws(' · ',nullif(trim(p_notes),''),'Direct transfer to '||v_destination.name),coalesce(p_paid_at,now()),'active',v_user_id,p_destination_party_id) returning * into v_payment;
 insert into public.account_vouchers(business_id,voucher_type,party_id,payment_method,account_name,amount,reference_no,notes,paid_at,status,created_by) values(v_business_id,'payment',p_destination_party_id,'party_transfer','Direct customer transfer',round(p_amount,2),nullif(trim(p_reference_no),''),concat_ws(' · ','Received by '||v_destination.name,'Against customer invoice '||v_invoice.invoice_no),coalesce(p_paid_at,now()),'active',v_user_id) returning * into v_transfer_voucher;
 v_voucher_no:='TR-'||upper(substr(replace(v_payment.id::text,'-',''),1,10));
 insert into public.journal_entries(business_id,voucher_type,voucher_no,entry_date,narration,reference_type,reference_id,status,created_by) values(v_business_id,'journal',v_voucher_no,coalesce(p_paid_at,now()),concat_ws(' · ','Direct customer payment transfer','Customer invoice '||v_invoice.invoice_no,'To '||v_destination.name),'sale_payment',v_payment.id,'posted',v_user_id) returning id into v_entry_id;
 insert into public.journal_lines(journal_entry_id,business_id,account_id,party_id,debit,credit,narration) values
 (v_entry_id,v_business_id,v_destination_account,p_destination_party_id,round(p_amount,2),0,'Direct transfer received from customer '||v_invoice.invoice_no),
 (v_entry_id,v_business_id,v_source_account,v_invoice.party_id,0,round(p_amount,2),'Customer payment transferred directly to '||v_destination.name);
 return v_payment;
end;$$;
grant execute on function public.record_sale_payment_to_party(uuid,uuid,numeric,text,text,timestamptz) to authenticated;

create or replace function public.record_staff_salary_payment(p_staff_profile_id uuid,p_payment_method text,p_amount numeric,p_reference_no text default null,p_notes text default null,p_paid_at timestamptz default now()) returns public.account_vouchers language plpgsql security definer set search_path=public as $$
declare v_business_id uuid:=public.current_business_id(); v_user_id uuid:=auth.uid(); v_staff public.profiles; v_staff_party public.parties; v_staff_account uuid; v_salary_account uuid; v_cash_bank_account uuid; v_voucher public.account_vouchers; v_entry_id uuid; v_voucher_no text; v_group_id uuid;
begin
 if v_business_id is null or v_user_id is null then raise exception 'Unauthorized'; end if;
 if public.current_user_role()<>'admin' then raise exception 'Admin access required'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Salary amount must be greater than zero'; end if;
 if p_payment_method not in ('cash','bank') then raise exception 'Salary can be paid only by cash or bank'; end if;
 select * into v_staff from public.profiles where id=p_staff_profile_id and business_id=v_business_id and role='staff' and is_active=true;
 if not found then raise exception 'Staff member not found or inactive'; end if;
 if v_staff.party_id is null then raise exception 'Staff ledger account is not linked'; end if;
 select * into v_staff_party from public.parties where id=v_staff.party_id and business_id=v_business_id and is_active=true;
 if not found then raise exception 'Staff ledger party is missing'; end if;
 select id into v_staff_account from public.accounts where business_id=v_business_id and party_id=v_staff_party.id and is_active=true limit 1;
 if v_staff_account is null then raise exception 'Staff ledger account is missing'; end if;
 select id into v_salary_account from public.accounts where business_id=v_business_id and lower(name)='salaries & wages' and account_nature='expense' and is_active=true limit 1;
 if v_salary_account is null then
   select id into v_group_id from public.account_groups where business_id=v_business_id and code='INDIRECT_EXPENSE' limit 1;
   if v_group_id is null then raise exception 'Indirect Expenses account group is missing'; end if;
   insert into public.accounts(business_id,account_group_id,account_code,name,account_nature,opening_balance,opening_balance_type,is_party_account,is_system,is_active,created_by) values(v_business_id,v_group_id,'EXP_SALARY','Salaries & Wages','expense',0,'none',false,false,true,v_user_id) returning id into v_salary_account;
 end if;
 select id into v_cash_bank_account from public.accounts where business_id=v_business_id and account_code=case when p_payment_method='cash' then 'SYS_CASH' else 'SYS_BANK' end and is_active=true limit 1;
 if v_cash_bank_account is null then raise exception 'Cash/Bank account is missing'; end if;
 insert into public.account_vouchers(business_id,voucher_type,party_id,payment_method,account_name,amount,reference_no,notes,paid_at,status,created_by) values(v_business_id,'payment',v_staff_party.id,p_payment_method,case when p_payment_method='cash' then 'Cash' else 'Bank' end,round(p_amount,2),nullif(trim(p_reference_no),''),concat_ws(' · ','Salary payment to '||v_staff.full_name,nullif(trim(p_notes),'')),coalesce(p_paid_at,now()),'active',v_user_id) returning * into v_voucher;
 v_voucher_no:='SAL-'||upper(substr(replace(v_voucher.id::text,'-',''),1,10));
 insert into public.journal_entries(business_id,voucher_type,voucher_no,entry_date,narration,reference_type,reference_id,status,created_by) values(v_business_id,'payment',v_voucher_no,coalesce(p_paid_at,now()),'Salary payment to '||v_staff.full_name,'account_voucher',v_voucher.id,'posted',v_user_id) returning id into v_entry_id;
 insert into public.journal_lines(journal_entry_id,business_id,account_id,party_id,debit,credit,narration) values
 (v_entry_id,v_business_id,v_salary_account,v_staff_party.id,round(p_amount,2),0,'Salary expense - '||v_staff.full_name),
 (v_entry_id,v_business_id,v_cash_bank_account,null,0,round(p_amount,2),'Salary paid to '||v_staff.full_name);
 return v_voucher;
end;$$;
grant execute on function public.record_staff_salary_payment(uuid,text,numeric,text,text,timestamptz) to authenticated;
