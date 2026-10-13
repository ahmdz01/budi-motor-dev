
BEGIN;

-- Counter rate limit disimpan sebagai hash IP, bukan IP mentah.
CREATE TABLE IF NOT EXISTS public.pin_reset_rate_limits (
  ip_hash text PRIMARY KEY
    CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  attempt_count integer NOT NULL
    CHECK (attempt_count BETWEEN 1 AND 11),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pin_reset_rate_limits_window_idx
  ON public.pin_reset_rate_limits (window_started_at);

ALTER TABLE public.pin_reset_rate_limits
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.pin_reset_rate_limits
  FROM PUBLIC, anon, authenticated, service_role;

-- Hapus RPC lama yang masih dapat dipanggil secara langsung.
REVOKE ALL PRIVILEGES
  ON FUNCTION public.request_pin_reset(character varying)
  FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION public.request_pin_reset(character varying);

-- RPC baru menerima IP hash yang dibuat di sisi server.
CREATE FUNCTION public.request_pin_reset(
  p_phone_number character varying,
  p_ip_hash text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_attempt_count integer;
BEGIN
  -- Validasi tetap dilakukan di database.
  IF p_phone_number IS NULL
     OR p_phone_number !~ '^[0-9]{10,15}$'
     OR p_ip_hash IS NULL
     OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN;
  END IF;

  -- Hapus counter yang sudah lama tidak aktif.
  DELETE FROM public.pin_reset_rate_limits
  WHERE window_started_at < v_now - interval '24 hours';

  -- Penghitungan atomik: paling banyak 10 permintaan per jam.
  INSERT INTO public.pin_reset_rate_limits (
    ip_hash,
    window_started_at,
    attempt_count,
    updated_at
  )
  VALUES (
    p_ip_hash,
    v_now,
    1,
    v_now
  )
  ON CONFLICT (ip_hash) DO UPDATE
  SET
    window_started_at = CASE
      WHEN public.pin_reset_rate_limits.window_started_at
           <= v_now - interval '1 hour'
      THEN v_now
      ELSE public.pin_reset_rate_limits.window_started_at
    END,
    attempt_count = CASE
      WHEN public.pin_reset_rate_limits.window_started_at
           <= v_now - interval '1 hour'
      THEN 1
      ELSE LEAST(
        public.pin_reset_rate_limits.attempt_count + 1,
        11
      )
    END,
    updated_at = v_now
  RETURNING attempt_count INTO v_attempt_count;

  -- Respons tetap generik ketika batas tercapai.
  IF v_attempt_count > 10 THEN
    RETURN;
  END IF;

  -- Indeks unik migration 0046 tetap menangani permintaan pending ganda.
  INSERT INTO public.pin_reset_requests (phone_number)
  VALUES (p_phone_number)
  ON CONFLICT (phone_number) WHERE status = 'pending'
  DO NOTHING;
END;
$function$;

-- Hanya server dengan service role yang boleh memanggil RPC.
REVOKE ALL PRIVILEGES
  ON FUNCTION public.request_pin_reset(character varying, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.request_pin_reset(character varying, text)
  TO service_role;

COMMIT;
