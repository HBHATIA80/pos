-- Phase 11 hardening: stock RPCs are not public API operations.
revoke execute on function public.adjust_stock(jsonb) from public;
grant execute on function public.adjust_stock(jsonb) to authenticated;
revoke execute on function public.apply_stock_movement(uuid,uuid,numeric,text,text,uuid,text) from public;
grant execute on function public.apply_stock_movement(uuid,uuid,numeric,text,text,uuid,text) to authenticated;
