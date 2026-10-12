
BEGIN;

-- RPC pembacaan yang hanya dibutuhkan pengguna terautentikasi.
REVOKE EXECUTE ON FUNCTION public.get_active_mechanics()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_mechanics()
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics()
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_service_detail(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_service_detail(uuid)
  TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_service_status_history(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_service_status_history(uuid)
  TO authenticated, service_role;

-- RPC perubahan data: hanya pengguna terautentikasi
-- dan service_role yang boleh menjalankan fungsi.
REVOKE EXECUTE ON FUNCTION public.sp_add_service_item(
  uuid, varchar, uuid, varchar, numeric, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_add_service_item(
  uuid, varchar, uuid, varchar, numeric, integer
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_approve_service_estimate(
  uuid, boolean, varchar
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_approve_service_estimate(
  uuid, boolean, varchar
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_change_service_status(
  uuid, varchar, uuid, varchar
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_change_service_status(
  uuid, varchar, uuid, varchar
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_confirm_service_payment(
  uuid, uuid, varchar, numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_confirm_service_payment(
  uuid, uuid, varchar, numeric
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_create_pos_transaction(
  uuid, uuid, varchar, jsonb, varchar, numeric
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_create_pos_transaction(
  uuid, uuid, varchar, jsonb, varchar, numeric
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_create_service(
  uuid, uuid, uuid, varchar, varchar, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_create_service(
  uuid, uuid, uuid, varchar, varchar, boolean
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_pay_supplier_debt(
  uuid, numeric, varchar
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_pay_supplier_debt(
  uuid, numeric, varchar
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_record_manual_ledger_entry(
  varchar, numeric, varchar, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_record_manual_ledger_entry(
  varchar, numeric, varchar, boolean
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_record_purchase(
  uuid, uuid, date, jsonb, numeric, date
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_record_purchase(
  uuid, uuid, date, jsonb, numeric, date
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_send_service_estimate(
  uuid, varchar
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_send_service_estimate(
  uuid, varchar
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_stock_opname_adjust(
  varchar, varchar, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_stock_opname_adjust(
  varchar, varchar, jsonb
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.sp_update_user_role(
  uuid, varchar
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sp_update_user_role(
  uuid, varchar
) TO authenticated, service_role;

-- request_pin_reset memang mungkin dibutuhkan sebelum login.
-- Hapus grant PUBLIC, tetapi pertahankan akses eksplisit yang
-- dibutuhkan alur reset PIN.
REVOKE EXECUTE ON FUNCTION public.request_pin_reset(varchar)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_pin_reset(varchar)
  TO anon, authenticated, service_role;

COMMIT;
