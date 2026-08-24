revoke execute on function public.adjust_stock(jsonb) from anon;
revoke execute on function public.apply_stock_movement(uuid,uuid,numeric,text,text,uuid,text) from anon;
grant execute on function public.adjust_stock(jsonb) to authenticated;
grant execute on function public.apply_stock_movement(uuid,uuid,numeric,text,text,uuid,text) to authenticated;
