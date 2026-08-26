create or replace function public.marketplace_products(
  p_q text default '',
  p_limit integer default 40,
  p_offset integer default 0,
  p_category_id uuid default null,
  p_subcategory_id uuid default null,
  p_brand_id uuid default null
)
returns table(
  product_id uuid,
  business_id uuid,
  shop_name text,
  shop_code text,
  product_name text,
  sku text,
  barcode text,
  sale_price numeric,
  image_url text,
  category_id uuid,
  subcategory_id uuid,
  brand_id uuid,
  category_name text,
  subcategory_name text,
  brand_name text,
  current_stock numeric
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.business_id,
    b.name,
    b.code,
    p.name,
    p.sku,
    p.barcode,
    p.sale_price,
    p.image_url,
    p.category_id,
    p.subcategory_id,
    p.brand_id,
    c.name,
    sc.name,
    br.name,
    p.current_stock
  from public.products p
  join public.businesses b on b.id = p.business_id
  left join public.catalog_categories c on c.id = p.category_id
  left join public.catalog_subcategories sc on sc.id = p.subcategory_id
  left join public.catalog_brands br on br.id = p.brand_id
  where b.status = 'active'
    and p.is_active = true
    and p.marketplace_enabled = true
    and (p_category_id is null or p.category_id = p_category_id)
    and (p_subcategory_id is null or p.subcategory_id = p_subcategory_id)
    and (p_brand_id is null or p.brand_id = p_brand_id)
    and (
      nullif(trim(p_q), '') is null
      or p.name ilike '%' || trim(p_q) || '%'
      or coalesce(p.sku, '') ilike '%' || trim(p_q) || '%'
      or coalesce(p.barcode, '') ilike '%' || trim(p_q) || '%'
      or b.name ilike '%' || trim(p_q) || '%'
      or coalesce(c.name, '') ilike '%' || trim(p_q) || '%'
      or coalesce(sc.name, '') ilike '%' || trim(p_q) || '%'
      or coalesce(br.name, '') ilike '%' || trim(p_q) || '%'
    )
  order by b.name asc, p.name asc
  limit least(greatest(coalesce(p_limit, 40), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.marketplace_products(text, integer, integer, uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.marketplace_facets() to anon, authenticated;
