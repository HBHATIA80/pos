-- Chart of accounts and party-account integration.
-- Applied to the production Supabase project as migration chart_of_accounts_and_party_accounts.

create table if not exists public.account_groups (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, code text not null, nature text not null check (nature in ('asset','liability','income','expense','equity')),
  parent_id uuid references public.account_groups(id) on delete restrict, is_system boolean not null default false, is_active boolean not null default true,
  created_at timestamptz not null default now(), unique (business_id, code), unique (business_id, name)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  account_group_id uuid not null references public.account_groups(id) on delete restrict, account_code text, name text not null,
  account_nature text not null check (account_nature in ('asset','liability','income','expense','equity')),
  party_id uuid references public.parties(id) on delete set null, opening_balance numeric(14,2) not null default 0,
  opening_balance_type text not null default 'none' check (opening_balance_type in ('none','debit','credit')),
  is_party_account boolean not null default false, is_system boolean not null default false, is_active boolean not null default true,
  notes text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (business_id, account_code), unique (business_id, name), unique (party_id)
);

alter table public.account_groups enable row level security; alter table public.accounts enable row level security;
drop policy if exists account_groups_business_access on public.account_groups;
create policy account_groups_business_access on public.account_groups for all using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());
drop policy if exists accounts_business_access on public.accounts;
create policy accounts_business_access on public.accounts for all using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());

insert into public.account_groups (business_id,name,code,nature,is_system)
select b.id, g.name, g.code, g.nature, true from public.businesses b cross join (values
('Capital Account','CAPITAL','equity'),('Reserves & Surplus','RESERVES','equity'),('Sundry Debtors','SUNDRY_DEBTORS','asset'),('Cash-in-Hand','CASH','asset'),('Bank Accounts','BANK','asset'),('Current Assets','CURRENT_ASSETS','asset'),('Fixed Assets','FIXED_ASSETS','asset'),('Investments','INVESTMENTS','asset'),('Loans & Advances (Asset)','LOANS_ADV_ASSET','asset'),('Sundry Creditors','SUNDRY_CREDITORS','liability'),('Duties & Taxes','DUTIES_TAXES','liability'),('Provisions','PROVISIONS','liability'),('Current Liabilities','CURRENT_LIABILITIES','liability'),('Loans (Liability)','LOANS_LIABILITY','liability'),('Direct Income','DIRECT_INCOME','income'),('Indirect Income','INDIRECT_INCOME','income'),('Sales Accounts','SALES','income'),('Direct Expenses','DIRECT_EXPENSE','expense'),('Indirect Expenses','INDIRECT_EXPENSE','expense'),('Purchase Accounts','PURCHASE','expense')) g(name,code,nature)
on conflict (business_id, code) do nothing;

insert into public.accounts (business_id,account_group_id,account_code,name,account_nature,party_id,opening_balance,opening_balance_type,is_party_account,created_by)
select p.business_id,ag.id,coalesce(p.party_code,'P-'||upper(substr(replace(p.id::text,'-',''),1,8))),p.name,
case when p.opening_balance_type='payable' or p.party_type='supplier' then 'liability' else 'asset' end,p.id,p.opening_balance,
case when p.opening_balance_type='payable' then 'credit' when p.opening_balance_type='receivable' then 'debit' else 'none' end,true,p.created_by
from public.parties p join public.account_groups ag on ag.business_id=p.business_id and ag.code=case when p.opening_balance_type='payable' or p.party_type='supplier' then 'SUNDRY_CREDITORS' else 'SUNDRY_DEBTORS' end
on conflict (party_id) do nothing;

create or replace function public.sync_party_account() returns trigger language plpgsql security definer set search_path=public as $$
declare group_id uuid; group_code text; nature text; balance_type text;
begin
if new.opening_balance_type='receivable' then group_code:='SUNDRY_DEBTORS'; nature:='asset'; balance_type:=case when new.opening_balance>0 then 'debit' else 'none' end;
elsif new.opening_balance_type='payable' then group_code:='SUNDRY_CREDITORS'; nature:='liability'; balance_type:=case when new.opening_balance>0 then 'credit' else 'none' end;
elsif new.party_type='supplier' then group_code:='SUNDRY_CREDITORS'; nature:='liability'; balance_type:='none';
else group_code:='SUNDRY_DEBTORS'; nature:='asset'; balance_type:='none'; end if;
select id into group_id from public.account_groups where business_id=new.business_id and code=group_code limit 1;
if group_id is null then raise exception 'Account group % is missing for business', group_code; end if;
insert into public.accounts (business_id,account_group_id,account_code,name,account_nature,party_id,opening_balance,opening_balance_type,is_party_account,created_by)
values (new.business_id,group_id,coalesce(new.party_code,'P-'||upper(substr(replace(new.id::text,'-',''),1,8))),new.name,nature,new.id,new.opening_balance,balance_type,true,new.created_by)
on conflict (party_id) do update set account_group_id=excluded.account_group_id,account_code=excluded.account_code,name=excluded.name,account_nature=excluded.account_nature,opening_balance=excluded.opening_balance,opening_balance_type=excluded.opening_balance_type,is_active=new.is_active,updated_at=now();
return new; end; $$;

drop trigger if exists parties_sync_account on public.parties;
create trigger parties_sync_account after insert or update of party_code,party_type,name,opening_balance,opening_balance_type,is_active on public.parties for each row execute function public.sync_party_account();