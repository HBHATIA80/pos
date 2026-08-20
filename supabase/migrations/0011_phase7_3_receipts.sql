-- ============================================================
-- Phase 7.3 — Payment Receipts
-- ============================================================
-- Adds a durable receipt number to every sale payment and exposes
-- a printable receipt lookup without changing payment semantics.
-- ============================================================

create sequence if not exists public.sale_payment_receipt_seq;

alter table public.sale_payments
  add column if not exists receipt_no text;

update public.sale_payments
set receipt_no = 'RCP-' || lpad(nextval('public.sale_payment_receipt_seq')::text, 8, '0')
where receipt_no is null;

alter table public.sale_payments
  alter column receipt_no set default ('RCP-' || lpad(nextval('public.sale_payment_receipt_seq')::text, 8, '0')),
  alter column receipt_no set not null;

create unique index if not exists uq_sale_payments_receipt_no
  on public.sale_payments (receipt_no);

comment on column public.sale_payments.receipt_no is
'Unique printable receipt number assigned when a payment is recorded.';
