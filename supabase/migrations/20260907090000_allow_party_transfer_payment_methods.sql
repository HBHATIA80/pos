alter table public.sale_payments drop constraint if exists sale_payments_method_check;
alter table public.sale_payments add constraint sale_payments_method_check check (payment_method = any (array['cash'::text, 'bank'::text, 'party_transfer'::text]));

alter table public.account_vouchers drop constraint if exists account_vouchers_method_check;
alter table public.account_vouchers add constraint account_vouchers_method_check check (payment_method = any (array['cash'::text, 'bank'::text, 'upi'::text, 'card'::text, 'cheque'::text, 'other'::text, 'party_transfer'::text]));
