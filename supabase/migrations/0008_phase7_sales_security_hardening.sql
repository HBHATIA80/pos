-- Phase 7 hardening: security-definer transaction functions are callable only by signed-in users.
revoke execute on function public.complete_sales_invoice(uuid) from public, anon;
revoke execute on function public.void_sales_invoice(uuid) from public, anon;
grant execute on function public.complete_sales_invoice(uuid) to authenticated;
grant execute on function public.void_sales_invoice(uuid) to authenticated;
