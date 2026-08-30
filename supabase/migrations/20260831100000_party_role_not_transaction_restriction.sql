-- Party role is an accounting classification, not a transaction permission.
-- A party may buy from us, sell to us, or do both regardless of its master role.
-- Transaction direction is determined by the voucher/invoice itself.
-- This migration removes legacy customer/supplier role gates from sale/purchase RPCs.

do $$
declare
  r record;
  v_sql text;
  v_new text;
begin
  for r in
    select p.oid, n.nspname, p.proname, pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        p.proname ilike '%sale%'
        or p.proname ilike '%purchase%'
      )
      and pg_get_functiondef(p.oid) like '%party_type%'
  loop
    v_sql := r.definition;
    v_new := replace(
      v_sql,
      '    if v_party.party_type not in (''customer'',''both'') then raise exception ''Customer not found or inactive''; end if;' || chr(10),
      ''
    );
    v_new := replace(
      v_new,
      '    if v_party.party_type not in (''customer'', ''both'') then raise exception ''Customer not found or inactive''; end if;' || chr(10),
      ''
    );
    v_new := replace(
      v_new,
      '    if v_party.party_type not in (''supplier'',''both'') then raise exception ''Supplier not found or inactive''; end if;' || chr(10),
      ''
    );
    v_new := replace(
      v_new,
      '    if v_party.party_type not in (''supplier'', ''both'') then raise exception ''Supplier not found or inactive''; end if;' || chr(10),
      ''
    );
    if v_new <> v_sql then
      execute v_new;
    end if;
  end loop;
end $$;

comment on table public.parties is
  'Business party master. party_type is an accounting classification; transaction eligibility is determined by the transaction type, not party_type.';
