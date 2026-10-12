BEGIN;

-- Satu nomor telepon hanya boleh memiliki satu permintaan pending.
CREATE UNIQUE INDEX IF NOT EXISTS
  pin_reset_requests_pending_phone_unique
ON public.pin_reset_requests (phone_number)
WHERE status = 'pending';

-- Cegah input tidak valid dan permintaan ganda secara atomik.
CREATE OR REPLACE FUNCTION public.request_pin_reset(
  p_phone_number character varying
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validasi di database tetap diperlukan karena RPC
  -- dapat dipanggil tanpa melewati validasi formulir.
  IF p_phone_number IS NULL
     OR p_phone_number !~ '^[0-9]{10,15}$' THEN
    RETURN;
  END IF;

  INSERT INTO public.pin_reset_requests (phone_number)
  VALUES (p_phone_number)
  ON CONFLICT (phone_number) WHERE status = 'pending'
  DO NOTHING;
END;
$function$;

COMMIT;