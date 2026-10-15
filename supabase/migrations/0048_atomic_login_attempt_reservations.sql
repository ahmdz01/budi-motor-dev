BEGIN;

-- Reservasi per akun mencegah beberapa login paralel melewati pengecekan
-- lockout sebelum percobaan gagal pertama sempat dicatat.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS login_attempt_id uuid,
  ADD COLUMN IF NOT EXISTS login_attempt_started_at timestamptz;

COMMENT ON COLUMN public.users.login_attempt_id IS
  'Token reservasi sementara untuk satu proses login yang sedang berlangsung.';
COMMENT ON COLUMN public.users.login_attempt_started_at IS
  'Waktu reservasi login dimulai; reservasi kedaluwarsa otomatis setelah 2 menit.';

CREATE OR REPLACE FUNCTION public.begin_login_attempt(
  p_phone_number character varying,
  p_attempt_id uuid
)
RETURNS TABLE (
  can_proceed boolean,
  is_locked boolean,
  locked_until timestamptz,
  is_busy boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_locked_until timestamptz;
  v_existing_attempt_id uuid;
  v_attempt_started_at timestamptz;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_phone_number IS NULL
     OR p_phone_number !~ '^[0-9]{10,15}$'
     OR p_attempt_id IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::timestamptz, false;
    RETURN;
  END IF;

  SELECT
    u.id,
    u.locked_until,
    u.login_attempt_id,
    u.login_attempt_started_at
  INTO
    v_user_id,
    v_locked_until,
    v_existing_attempt_id,
    v_attempt_started_at
  FROM public.users AS u
  WHERE u.phone_number = p_phone_number
    AND u.status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::timestamptz, false;
    RETURN;
  END IF;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT false, true, v_locked_until, false;
    RETURN;
  END IF;

  -- Setelah masa lockout habis, bersihkan hitungan lama dan reservasi lama.
  IF v_locked_until IS NOT NULL AND v_locked_until <= v_now THEN
    UPDATE public.users AS u
    SET
      failed_login_attempts = 0,
      locked_until = NULL,
      login_attempt_id = NULL,
      login_attempt_started_at = NULL
    WHERE u.id = v_user_id;

    v_locked_until := NULL;
    v_existing_attempt_id := NULL;
    v_attempt_started_at := NULL;
  END IF;

  -- Satu proses login per akun pada satu waktu. Jika request sebelumnya
  -- macet atau koneksinya hilang, reservasi dapat diambil lagi setelah 2 menit.
  IF v_existing_attempt_id IS NOT NULL
     AND v_attempt_started_at IS NOT NULL
     AND v_attempt_started_at > v_now - interval '2 minutes' THEN
    RETURN QUERY SELECT false, false, NULL::timestamptz, true;
    RETURN;
  END IF;

  UPDATE public.users AS u
  SET
    login_attempt_id = p_attempt_id,
    login_attempt_started_at = v_now
  WHERE u.id = v_user_id;

  RETURN QUERY SELECT true, false, NULL::timestamptz, false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.finish_login_attempt(
  p_phone_number character varying,
  p_attempt_id uuid,
  p_outcome text
)
RETURNS TABLE (
  applied boolean,
  failed_attempts smallint,
  locked_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_failed_attempts smallint;
  v_locked_until timestamptz;
  v_existing_attempt_id uuid;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_outcome IS NULL OR p_outcome NOT IN (
    'success', 'invalid_credentials', 'aborted'
  ) THEN
    RAISE EXCEPTION 'Hasil percobaan login tidak valid.'
      USING ERRCODE = '22023';
  END IF;

  IF p_phone_number IS NULL
     OR p_phone_number !~ '^[0-9]{10,15}$'
     OR p_attempt_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::smallint, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT
    u.failed_login_attempts,
    u.locked_until,
    u.login_attempt_id
  INTO
    v_failed_attempts,
    v_locked_until,
    v_existing_attempt_id
  FROM public.users AS u
  WHERE u.phone_number = p_phone_number
    AND u.status = 'active'
  FOR UPDATE;

  -- Request lama tidak boleh menyelesaikan atau menghapus reservasi baru.
  IF NOT FOUND OR v_existing_attempt_id IS DISTINCT FROM p_attempt_id THEN
    RETURN QUERY SELECT false, NULL::smallint, NULL::timestamptz;
    RETURN;
  END IF;

  IF p_outcome = 'success' THEN
    UPDATE public.users AS u
    SET
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = v_now,
      login_attempt_id = NULL,
      login_attempt_started_at = NULL
    WHERE u.phone_number = p_phone_number;

    v_failed_attempts := 0;
    v_locked_until := NULL;

  ELSIF p_outcome = 'invalid_credentials' THEN
    v_failed_attempts := LEAST(COALESCE(v_failed_attempts, 0) + 1, 5);
    v_locked_until := CASE
      WHEN v_failed_attempts >= 5 THEN v_now + interval '15 minutes'
      ELSE NULL
    END;

    UPDATE public.users AS u
    SET
      failed_login_attempts = v_failed_attempts,
      locked_until = v_locked_until,
      login_attempt_id = NULL,
      login_attempt_started_at = NULL
    WHERE u.phone_number = p_phone_number;

  ELSE
    -- Error jaringan/429 bukan PIN salah; hanya lepaskan reservasi.
    UPDATE public.users AS u
    SET
      login_attempt_id = NULL,
      login_attempt_started_at = NULL
    WHERE u.phone_number = p_phone_number;
  END IF;

  RETURN QUERY SELECT true, v_failed_attempts, v_locked_until;
END;
$function$;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.begin_login_attempt(character varying, uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.begin_login_attempt(character varying, uuid)
  TO service_role;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.finish_login_attempt(character varying, uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.finish_login_attempt(character varying, uuid, text)
  TO service_role;

COMMIT;
