-- Phase 7.3: durable payment receipt number for the existing sale_payments table.
-- Existing payment rows receive a deterministic receipt number from their UUID.
-- New rows use the same expression automatically, so no change to the payment RPC is required.

alter table public.sale_payments
  add column if not exists receipt_no text;

update public.sale_payments
set receipt_no = 'RC-' || upper(replace(substr(id::text, 1, 8), '-', ''))
where receipt_no is null;

alter table public.sale_payments
  alter column receipt_no set not null;

create unique index if not exists sale_payments_receipt_no_unique_idx
  on public.sale_payments(receipt_no);

create or replace function public.set_sale_payment_receipt_no()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.receipt_no is null or btrim(new.receipt_no) = '' then
    new.receipt_no := 'RC-' || upper(replace(substr(new.id::text, 1, 8), '-', ''));
  end if;
  return new;
end;
$$;

drop trigger if exists sale_payments_set_receipt_no on public.sale_payments;
create trigger sale_payments_set_receipt_no
before insert on public.sale_payments
for each row
execute function public.set_sale_payment_receipt_no();

comment on column public.sale_payments.receipt_no is 'Durable receipt identifier for payment history and receipt reprint.';
