-- ============================================================
-- 0022_sp_add_service_item.sql
-- Langkah 7.3 — Tambah Item Servis.
--
-- Dua jenis item:
-- - 'product': harga diambil OTORITATIF dari product_prices sesuai
--   customer_type_used milik servis (bukan dari client, pola sama
--   persis dengan sp_create_pos_transaction), lalu stok dikonsumsi
--   FIFO dari inventory_batches (pola sama persis juga).
-- - 'labor': skema service_items (0006, sudah dimigrasikan sejak
--   Phase 3) sengaja membuat product_id nullable dan name_snapshot/
--   price_snapshot berdiri sendiri — desainnya memang mengantisipasi
--   item tanpa katalog produk. Tidak ada tabel katalog jasa terpisah
--   di 28 tabel yang ada, jadi nama+harga jasa diinput manual oleh
--   yang menambahkan item, konsisten dengan desain skema tsb (bukan
--   keputusan baru). Kalau ke depan Anda mau katalog jasa dengan
--   harga standar, itu baru perlu tabel tambahan di luar skema saat ini.
--
-- Item hanya boleh ditambahkan selama status servis = 'in_progress',
-- dan hanya oleh mekanik yang ditugaskan atau Owner/Admin/Kasir/
-- Super Admin.
-- ============================================================

create or replace function public.sp_add_service_item(
  p_service_id uuid,
  p_item_type varchar(20),
  p_product_id uuid default null,
  p_name varchar(150) default null,
  p_price numeric default null,
  p_qty integer default 1
)
returns table (service_item_id uuid, subtotal numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_service_status varchar;
  v_service_mechanic uuid;
  v_customer_type_used varchar;
  v_service_item_id uuid;
  v_price numeric;
  v_name varchar(150);
  v_remaining integer;
  v_batch record;
  v_take integer;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  v_user_id := auth.uid();

  if v_role is null then
    raise exception 'Akses ditolak.' using errcode = '42501';
  end if;

  select status, mechanic_id, customer_type_used
  into v_service_status, v_service_mechanic, v_customer_type_used
  from public.services
  where id = p_service_id
  for update;

  if not found then
    raise exception 'Servis tidak ditemukan.' using errcode = '22023';
  end if;

  if v_service_status <> 'in_progress' then
    raise exception 'Item hanya bisa ditambahkan saat servis berstatus Dikerjakan.'
      using errcode = '22023';
  end if;

  if not (
    v_role in ('owner', 'admin', 'kasir', 'super_admin')
    or (v_role = 'mekanik' and v_service_mechanic = v_user_id)
  ) then
    raise exception 'Akses ditolak: hanya mekanik yang ditugaskan atau Owner/Admin/Kasir/Super Admin.'
      using errcode = '42501';
  end if;

  if p_item_type not in ('product', 'labor') then
    raise exception 'Tipe item tidak valid.' using errcode = '22023';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'Qty harus lebih dari 0.' using errcode = '22023';
  end if;

  if p_item_type = 'product' then
    if p_product_id is null then
      raise exception 'Produk wajib dipilih.' using errcode = '22023';
    end if;

    select price_value into v_price
    from public.product_prices
    where product_id = p_product_id and price_type = v_customer_type_used;

    if v_price is null then
      raise exception 'Harga tidak ditemukan untuk produk ini.' using errcode = '22023';
    end if;

    select name into v_name from public.products where id = p_product_id;
  else
    if p_name is null or length(trim(p_name)) < 3 then
      raise exception 'Nama jasa wajib diisi (minimal 3 karakter).' using errcode = '22023';
    end if;

    if p_price is null or p_price <= 0 then
      raise exception 'Harga jasa wajib diisi dan lebih dari 0.' using errcode = '22023';
    end if;

    v_name := trim(p_name);
    v_price := p_price;
  end if;

  insert into public.service_items (
    service_id, item_type, product_id, name_snapshot, price_snapshot, qty, added_by
  ) values (
    p_service_id, p_item_type, p_product_id, v_name, v_price, p_qty, v_user_id
  )
  returning id into v_service_item_id;

  if p_item_type = 'product' then
    v_remaining := p_qty;

    for v_batch in
      select id, qty_sisa, harga_beli from public.inventory_batches
      where product_id = p_product_id and status = 'active' and qty_sisa > 0
      order by received_at asc
      for update
    loop
      exit when v_remaining <= 0;

      v_take := least(v_remaining, v_batch.qty_sisa);

      update public.inventory_batches
      set qty_sisa = qty_sisa - v_take,
          status = case when qty_sisa - v_take = 0 then 'depleted' else status end
      where id = v_batch.id;

      insert into public.stock_consumptions (
        batch_id, service_item_id, qty, hpp_at_time
      ) values (
        v_batch.id, v_service_item_id, v_take, v_batch.harga_beli
      );

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stok tidak cukup untuk produk ini.' using errcode = '22023';
    end if;
  end if;

  return query select v_service_item_id, (v_price * p_qty);
end;
$$;

grant execute on function public.sp_add_service_item(uuid, varchar, uuid, varchar, numeric, integer) to authenticated;