-- Inventory ledger reconciliation and future opening-stock capture.
-- Existing products created before movement tracking had opening_stock/current_stock
-- but no opening ledger entry. Reconcile those records without changing their
-- effective stock, and make future product creation auditable.

DO $$
DECLARE
  r record;
  v_missing numeric;
BEGIN
  INSERT INTO public.stock_movements(
    business_id, product_id, movement_type, quantity,
    reference_type, reference_id, notes, created_by, created_at
  )
  SELECT p.business_id, p.id, 'opening', p.opening_stock,
         'product', p.id, 'Opening stock baseline reconciled', p.created_by, p.created_at
  FROM public.products p
  WHERE p.opening_stock > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.stock_movements sm
      WHERE sm.product_id = p.id AND sm.business_id = p.business_id
        AND sm.movement_type = 'opening'
    );

  FOR r IN
    SELECT p.id, p.business_id, p.current_stock, p.created_by,
           COALESCE(SUM(ii.quantity),0) AS sold_qty
    FROM public.products p
    JOIN public.sales_invoice_items ii ON ii.product_id = p.id
    JOIN public.sales_invoices si ON si.id = ii.invoice_id
    WHERE p.opening_stock = 0
      AND p.current_stock >= 0
      AND si.status = 'completed'
      AND si.deleted_at IS NULL
      AND si.cancelled_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.stock_movements sm
        WHERE sm.product_id = p.id AND sm.business_id = p.business_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.purchase_invoice_items pii
        JOIN public.purchase_invoices pi ON pi.id = pii.invoice_id
        WHERE pii.product_id = p.id AND pi.status = 'completed'
          AND pi.deleted_at IS NULL AND pi.cancelled_at IS NULL
      )
    GROUP BY p.id, p.business_id, p.current_stock, p.created_by
    HAVING COALESCE(SUM(ii.quantity),0) > 0
  LOOP
    UPDATE public.products
      SET opening_stock = r.current_stock + r.sold_qty,
          updated_at = now()
    WHERE id = r.id AND business_id = r.business_id;

    INSERT INTO public.stock_movements(
      business_id, product_id, movement_type, quantity,
      reference_type, reference_id, notes, created_by, created_at
    )
    VALUES (
      r.business_id, r.id, 'opening', r.current_stock + r.sold_qty,
      'product', r.id, 'Legacy opening stock inferred during inventory reconciliation', r.created_by, now()
    );
  END LOOP;

  FOR r IN
    SELECT si.id AS invoice_id, si.business_id, ii.product_id,
           ii.quantity AS expected_qty, p.current_stock,
           COALESCE((
             SELECT SUM(sm.quantity)
             FROM public.stock_movements sm
             WHERE sm.business_id = si.business_id
               AND sm.product_id = ii.product_id
               AND sm.reference_type = 'sale'
               AND sm.reference_id = si.id
               AND sm.movement_type = 'sale'
           ),0) AS recorded_qty,
           EXISTS (
             SELECT 1 FROM public.stock_movements om
             WHERE om.business_id = si.business_id
               AND om.product_id = ii.product_id
               AND om.movement_type = 'opening'
               AND om.notes = 'Legacy opening stock inferred during inventory reconciliation'
           ) AS inferred_opening
    FROM public.sales_invoices si
    JOIN public.sales_invoice_items ii ON ii.invoice_id = si.id
    JOIN public.products p ON p.id = ii.product_id AND p.business_id = si.business_id
    WHERE si.status = 'completed'
      AND si.deleted_at IS NULL
      AND si.cancelled_at IS NULL
  LOOP
    v_missing := r.expected_qty - r.recorded_qty;
    IF v_missing <= 0 THEN CONTINUE; END IF;

    IF r.inferred_opening THEN
      INSERT INTO public.stock_movements(
        business_id, product_id, movement_type, quantity,
        reference_type, reference_id, notes, created_by, created_at
      )
      SELECT r.business_id, r.product_id, 'sale', v_missing,
             'sale', r.invoice_id,
             'Legacy sale movement reconciled without changing already-correct stock balance',
             si.created_by, si.created_at
      FROM public.sales_invoices si
      WHERE si.id = r.invoice_id;
    ELSIF r.current_stock >= v_missing THEN
      PERFORM public.apply_stock_movement(
        r.product_id, r.business_id, -v_missing,
        'sale', 'sale', r.invoice_id,
        'Legacy completed sale movement reconciled'
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.stock_analysis AS
SELECT
  p.business_id,
  p.id AS product_id,
  p.sku,
  p.name,
  p.current_stock,
  p.reorder_level,
  p.purchase_price,
  p.sale_price,
  p.is_active,
  COALESCE(SUM(CASE WHEN sm.movement_type IN ('sale','purchase_return_out','adjustment_out','damage','wastage','purchase_void') THEN sm.quantity ELSE 0 END),0) AS units_out,
  COALESCE(SUM(CASE WHEN sm.movement_type IN ('purchase','adjustment_in','opening','sales_return','sale_void') THEN sm.quantity ELSE 0 END),0) AS units_in,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN sm.quantity WHEN sm.movement_type = 'sale_void' THEN -sm.quantity ELSE 0 END),0) AS sold_units,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'purchase' THEN sm.quantity WHEN sm.movement_type = 'purchase_void' THEN -sm.quantity ELSE 0 END),0) AS purchased_units,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'sale' THEN sm.quantity * COALESCE(p.sale_price,0) WHEN sm.movement_type = 'sale_void' THEN -sm.quantity * COALESCE(p.sale_price,0) ELSE 0 END),0) AS sales_value,
  COALESCE(SUM(CASE WHEN sm.movement_type = 'purchase' THEN sm.quantity * COALESCE(p.purchase_price,0) WHEN sm.movement_type = 'purchase_void' THEN -sm.quantity * COALESCE(p.purchase_price,0) ELSE 0 END),0) AS purchase_value,
  COALESCE(p.current_stock,0) * COALESCE(p.purchase_price,0) AS stock_cost_value,
  COALESCE(p.current_stock,0) * COALESCE(p.sale_price,0) AS stock_retail_value,
  MAX(sm.created_at) AS last_movement_at
FROM public.products p
LEFT JOIN public.stock_movements sm
  ON sm.product_id = p.id AND sm.business_id = p.business_id
GROUP BY p.business_id,p.id,p.sku,p.name,p.current_stock,p.reorder_level,p.purchase_price,p.sale_price,p.is_active;

CREATE OR REPLACE FUNCTION public.record_product_opening_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  IF COALESCE(NEW.opening_stock,0) > 0 THEN
    INSERT INTO public.stock_movements(
      business_id, product_id, movement_type, quantity,
      reference_type, reference_id, notes, created_by, created_at
    )
    VALUES (
      NEW.business_id, NEW.id, 'opening', NEW.opening_stock,
      'product', NEW.id, 'Opening stock', NEW.created_by, COALESCE(NEW.created_at,now())
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_opening_stock ON public.products;
CREATE TRIGGER trg_products_opening_stock
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.record_product_opening_stock();

grant execute on function public.record_product_opening_stock() to authenticated;
