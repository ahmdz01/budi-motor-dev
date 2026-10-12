
BEGIN;

-- Hanya role aplikasi resmi yang dianggap valid.
CREATE OR REPLACE FUNCTION public.has_app_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role_code')
      IN ('owner', 'admin', 'kasir', 'mekanik', 'super_admin'),
    false
  );
$function$;

-- Fungsi hanya boleh dipanggil oleh role database yang diperlukan.
REVOKE ALL ON FUNCTION public.has_app_role()
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_app_role()
TO anon, authenticated, service_role;

-- Daftar tabel yang ditemukan pada hasil audit.
-- Policy lama tetap ada, tetapi kini mensyaratkan role aplikasi valid.
-- Policy RESTRICTIVE menjadi pengaman tambahan apabila ada policy
-- permissive lain yang masih mengizinkan akses lebih luas.
DO $migration$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'brands',
    'categories',
    'customers',
    'inventory_batches',
    'product_prices',
    'products',
    'purchase_items',
    'purchases',
    'returns',
    'service_catalog',
    'service_estimates',
    'service_items',
    'service_status_history',
    'services',
    'stock_consumptions',
    'stock_opname_items',
    'stock_opname_sessions',
    'store_settings',
    'supplier_debt_payments',
    'supplier_debts',
    'suppliers',
    'transaction_items',
    'vehicles'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON public.%I
       TO authenticated
       USING (public.has_app_role())',
      v_table || '_select_authenticated',
      v_table
    );

    EXECUTE format(
      'CREATE POLICY s23_valid_role_gate
       ON public.%I
       AS RESTRICTIVE
       FOR SELECT
       TO public
       USING (public.has_app_role())',
      v_table
    );
  END LOOP;
END;
$migration$;

COMMIT;