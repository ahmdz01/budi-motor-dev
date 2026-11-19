-- S11: Restrict sensitive financial and inventory-cost reads.
-- Only owner, admin, and super_admin can read these tables.

CREATE POLICY s11_inventory_batches_select_role_gate
ON public.inventory_batches
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
  IN ('owner', 'admin', 'super_admin')
);

CREATE POLICY s11_stock_consumptions_select_role_gate
ON public.stock_consumptions
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
  IN ('owner', 'admin', 'super_admin')
);

CREATE POLICY s11_purchases_select_role_gate
ON public.purchases
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
  IN ('owner', 'admin', 'super_admin')
);

CREATE POLICY s11_purchase_items_select_role_gate
ON public.purchase_items
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
  IN ('owner', 'admin', 'super_admin')
);

CREATE POLICY s11_supplier_debts_select_role_gate
ON public.supplier_debts
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
  IN ('owner', 'admin', 'super_admin')
);

CREATE POLICY s11_supplier_debt_payments_select_role_gate
ON public.supplier_debt_payments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role_code')
  IN ('owner', 'admin', 'super_admin')
);

-- Transaction details:
-- Owner/admin/super_admin can read all transaction items.
-- Other valid users can read items only when the parent transaction
-- is visible to them and belongs to their own user ID.
CREATE POLICY s11_transaction_items_select_owner_or_own
ON public.transaction_items
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  (
    auth.jwt() -> 'app_metadata' ->> 'role_code'
  ) IN ('owner', 'admin', 'super_admin')
  OR (
    (auth.jwt() -> 'app_metadata' ->> 'role_code') = 'kasir'
    AND EXISTS (
      SELECT 1
      FROM public.transactions AS t
      WHERE t.id = transaction_items.transaction_id
        AND t.cashier_id = (SELECT auth.uid())
    )
  )
);

-- Preserve operational stock visibility without exposing inventory batch costs.
-- This view only exposes product_id and aggregated total_stock.
-- The underlying inventory_batches table remains protected by its RLS policy.
ALTER VIEW public.current_stock_per_product
SET (security_invoker = false);