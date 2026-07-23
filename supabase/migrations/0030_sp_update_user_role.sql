-- ============================================================
-- 0030_sp_update_user_role.sql
-- Langkah 11.2c — Ubah Role. Update auth.users.raw_app_meta_data
-- (sumber kebenaran, dibaca middleware dari JWT) DAN
-- public.users.role_code (mirror untuk JOIN) sekaligus.
--
-- Sesuai Critical C8: user TIDAK BOLEH ubah role sendiri lewat
-- jalur mana pun — diblokir eksplisit di sini, terpisah total dari
-- endpoint update profil biasa (yang bahkan tidak menyentuh role
-- sama sekali).
-- ============================================================

create or replace function public.sp_update_user_role(
  p_user_id uuid,
  p_new_role varchar
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
  v_caller_id uuid;
  v_target_role varchar;
begin
  v_caller_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  v_caller_id := auth.uid();

  if v_caller_role is null or v_caller_role not in ('owner', 'admin', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Super Admin.'
      using errcode = '42501';
  end if;

  if p_user_id = v_caller_id then
    raise exception 'Tidak bisa mengubah role akun sendiri.' using errcode = '22023';
  end if;

  if p_new_role not in ('owner', 'admin', 'kasir', 'mekanik', 'super_admin') then
    raise exception 'Role tidak valid.' using errcode = '22023';
  end if;

  select role_code into v_target_role from public.users where id = p_user_id for update;

  if not found then
    raise exception 'Pengguna tidak ditemukan.' using errcode = '22023';
  end if;

  if v_caller_role = 'admin' then
    if v_target_role not in ('kasir', 'mekanik') or p_new_role not in ('kasir', 'mekanik') then
      raise exception 'Admin hanya boleh mengubah role akun Kasir/Mekanik.'
        using errcode = '42501';
    end if;
  end if;

  update auth.users
  set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role_code', p_new_role)
  where id = p_user_id;

  update public.users set role_code = p_new_role where id = p_user_id;
end;
$$;

grant execute on function public.sp_update_user_role(uuid, varchar) to authenticated;