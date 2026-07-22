-- ============================================================
-- 0026_profit_tracking.sql
-- Langkah 9.1 — Pencatatan Profit Real-Time.
--
-- Menemukan bahwa category='profit' di financial_ledger tidak
-- pernah ditulis oleh RPC manapun sejak Phase 6/7 dibangun —
-- Dashboard "Laba Hari Ini" selama ini selalu Rp0. Migrasi ini:
-- (1) retrofit 3 RPC yang sudah ada supaya menghitung & mencatat
-- profit di saat yang sama seperti kas dicatat, (2) backfill data
-- historis yang sudah terjadi sebelum migrasi ini.
-- ============================================================

-- ---------- 1. sp_create_pos_transaction ----------
create or replace function public.sp_create_pos_transaction(
  p_client_uuid uuid,
  p_customer_id uuid,
  p_customer_type_used varchar(20),
  p_items jsonb,
  p_payment_method varchar(20),
  p_amount_received numeric default null
)
returns table (transaction_id uuid, total_amount numeric, change_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_transaction_id uuid;
  v_total numeric := 0;
  v_total_cogs numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_price numeric;
  v_product_name varchar(150);
  v_tx_item_id uuid;
  v_remaining integer;
  v_batch record;
  v_take integer;
  v_change numeric;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang tidak boleh kosong.' using errcode = '22023';
  end if;

  if p_payment_method not in ('cash', 'qris', 'transfer') then
    raise exception 'Metode pembayaran tidak valid.' using errcode = '22023';
  end if;

  if p_customer_type_used not in ('general', 'service', 'workshop') then
    raise exception 'Tipe pelanggan tidak valid.' using errcode = '22023';
  end if;

  select coalesce(sum(
    (item->>'qty')::integer *
    (select pp.price_value from public.product_prices pp
     where pp.product_id = (item->>'product_id')::uuid
       and pp.price_type = p_customer_type_used)
  ), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'Salah satu barang tidak memiliki harga untuk tipe pelanggan ini.'
      using errcode = '22023';
  end if;

  if p_payment_method = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Jumlah uang diterima kurang dari total belanja.'
        using errcode = '22023';
    end if;
    v_change := p_amount_received - v_total;
  else
    v_change := 0;
  end if;

  insert into public.transactions (
    client_uuid, customer_id, customer_type_used, cashier_id, source,
    total_amount, payment_method, amount_received
  ) values (
    p_client_uuid, p_customer_id, p_customer_type_used, v_user_id, 'pos',
    v_total, p_payment_method, p_amount_received
  )
  returning id into v_transaction_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'qty')::integer;

    if v_qty <= 0 then
      raise exception 'Qty barang harus lebih dari 0.' using errcode = '22023';
    end if;

    select price_value into v_price
    from public.product_prices
    where product_id = v_product_id and price_type = p_customer_type_used;

    if v_price is null then
      raise exception 'Harga tidak ditemukan untuk salah satu barang.' using errcode = '22023';
    end if;

    select name into v_product_name from public.products where id = v_product_id;

    insert into public.transaction_items (
      transaction_id, item_type, product_id, name_snapshot, price_snapshot, qty
    ) values (
      v_transaction_id, 'product', v_product_id, v_product_name, v_price, v_qty
    )
    returning id into v_tx_item_id;

    v_remaining := v_qty;

    for v_batch in
      select id, qty_sisa, harga_beli from public.inventory_batches
      where product_id = v_product_id and status = 'active' and qty_sisa > 0
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
        batch_id, transaction_item_id, qty, hpp_at_time
      ) values (
        v_batch.id, v_tx_item_id, v_take, v_batch.harga_beli
      );

      -- BARU: akumulasi HPP untuk hitung profit setelah semua item diproses.
      v_total_cogs := v_total_cogs + (v_take * v_batch.harga_beli);

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stok tidak cukup untuk salah satu barang saat transaksi diproses.'
        using errcode = '22023';
    end if;
  end loop;

  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('cash', v_total, 'transaction', v_transaction_id, 'Penjualan POS');

  -- BARU: catat profit (revenue - HPP) di saat yang sama.
  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('profit', v_total - v_total_cogs, 'transaction', v_transaction_id, 'Laba Penjualan POS');

  return query select v_transaction_id, v_total, v_change;
end;
$$;

-- ---------- 2. sp_confirm_service_payment ----------
create or replace function public.sp_confirm_service_payment(
  p_service_id uuid,
  p_client_uuid uuid,
  p_payment_method varchar(20),
  p_amount_received numeric default null
)
returns table (transaction_id uuid, total_amount numeric, change_amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_service record;
  v_total numeric;
  v_total_cogs numeric := 0;
  v_item_cogs numeric;
  v_transaction_id uuid;
  v_change numeric;
  v_item record;
  v_existing record;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  select t.id, t.total_amount, t.amount_received
  into v_existing
  from public.transactions t
  where t.service_id = p_service_id and t.source = 'service';

  if found then
    return query select
      v_existing.id,
      v_existing.total_amount,
      coalesce(v_existing.amount_received, 0) - v_existing.total_amount;
    return;
  end if;

  select id, status, customer_id, customer_type_used
  into v_service
  from public.services
  where id = p_service_id
  for update;

  if not found then
    raise exception 'Servis tidak ditemukan.' using errcode = '22023';
  end if;

  if v_service.status <> 'completed' then
    raise exception 'Pembayaran hanya bisa dikonfirmasi saat servis berstatus Selesai.'
      using errcode = '22023';
  end if;

  if p_payment_method not in ('cash', 'qris', 'transfer') then
    raise exception 'Metode pembayaran tidak valid.' using errcode = '22023';
  end if;

  select coalesce(sum(subtotal), 0) into v_total
  from public.service_items
  where service_id = p_service_id;

  if v_total <= 0 then
    raise exception 'Servis ini belum memiliki item untuk ditagih.' using errcode = '22023';
  end if;

  if p_payment_method = 'cash' then
    if p_amount_received is null or p_amount_received < v_total then
      raise exception 'Jumlah uang diterima kurang dari total tagihan.'
        using errcode = '22023';
    end if;
    v_change := p_amount_received - v_total;
  else
    v_change := 0;
  end if;

  insert into public.transactions (
    client_uuid, customer_id, customer_type_used, cashier_id, source, service_id,
    total_amount, payment_method, amount_received
  ) values (
    p_client_uuid, v_service.customer_id, v_service.customer_type_used, v_user_id, 'service', p_service_id,
    v_total, p_payment_method, p_amount_received
  )
  returning id into v_transaction_id;

  for v_item in
    select id, item_type, product_id, name_snapshot, price_snapshot, qty
    from public.service_items
    where service_id = p_service_id
  loop
    insert into public.transaction_items (
      transaction_id, item_type, product_id, service_item_id, name_snapshot, price_snapshot, qty
    ) values (
      v_transaction_id, v_item.item_type, v_item.product_id, v_item.id,
      v_item.name_snapshot, v_item.price_snapshot, v_item.qty
    );

    -- BARU: HPP jasa selalu 0 (tidak ada stock_consumptions untuk labor),
    -- HPP produk diambil dari konsumsi yang tercatat sejak sp_add_service_item (7.3).
    select coalesce(sum(qty * hpp_at_time), 0) into v_item_cogs
    from public.stock_consumptions
    where service_item_id = v_item.id;

    v_total_cogs := v_total_cogs + v_item_cogs;
  end loop;

  update public.services set status = 'paid' where id = p_service_id;

  insert into public.service_status_history (service_id, status_from, status_to, changed_by, reason)
  values (p_service_id, 'completed', 'paid', v_user_id, 'Pembayaran dikonfirmasi.');

  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('cash', v_total, 'transaction', v_transaction_id, 'Pembayaran Servis');

  -- BARU: catat profit servis.
  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('profit', v_total - v_total_cogs, 'transaction', v_transaction_id, 'Laba Servis');

  return query select v_transaction_id, v_total, v_change;
end;
$$;

-- ---------- 3. sp_process_return ----------
create or replace function public.sp_process_return(
  p_qty_returned integer,
  p_reason varchar,
  p_refund_amount numeric,
  p_transaction_item_id uuid default null,
  p_service_item_id uuid default null,
  p_restock boolean default true
)
returns table (return_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_item_type varchar;
  v_product_id uuid;
  v_original_qty integer;
  v_price_snapshot numeric;
  v_parent_status varchar;
  v_already_returned integer;
  v_remaining integer;
  v_avg_hpp numeric;
  v_profit_reversal numeric;
  v_return_id uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if (p_transaction_item_id is null) = (p_service_item_id is null) then
    raise exception 'Retur harus merujuk salah satu item transaksi atau item servis, tidak keduanya/tidak dua-duanya.'
      using errcode = '22023';
  end if;

  if p_qty_returned <= 0 then
    raise exception 'Qty retur harus lebih dari 0.' using errcode = '22023';
  end if;

  if p_refund_amount < 0 then
    raise exception 'Jumlah refund tidak boleh negatif.' using errcode = '22023';
  end if;

  if length(trim(p_reason)) < 3 then
    raise exception 'Alasan retur wajib diisi (minimal 3 karakter).' using errcode = '22023';
  end if;

  if p_transaction_item_id is not null then
    select ti.item_type, ti.product_id, ti.qty, ti.price_snapshot, t.status
    into v_item_type, v_product_id, v_original_qty, v_price_snapshot, v_parent_status
    from public.transaction_items ti
    join public.transactions t on t.id = ti.transaction_id
    where ti.id = p_transaction_item_id
    for update of ti;

    if not found then
      raise exception 'Item transaksi tidak ditemukan.' using errcode = '22023';
    end if;

    if v_parent_status <> 'paid' then
      raise exception 'Transaksi ini tidak berstatus Lunas.' using errcode = '22023';
    end if;

    select coalesce(sum(qty_returned), 0) into v_already_returned
    from public.returns where transaction_item_id = p_transaction_item_id;

    select avg(hpp_at_time) into v_avg_hpp
    from public.stock_consumptions where transaction_item_id = p_transaction_item_id;
  else
    select si.item_type, si.product_id, si.qty, si.price_snapshot, s.status
    into v_item_type, v_product_id, v_original_qty, v_price_snapshot, v_parent_status
    from public.service_items si
    join public.services s on s.id = si.service_id
    where si.id = p_service_item_id
    for update of si;

    if not found then
      raise exception 'Item servis tidak ditemukan.' using errcode = '22023';
    end if;

    if v_parent_status <> 'paid' then
      raise exception 'Servis ini belum Lunas.' using errcode = '22023';
    end if;

    select coalesce(sum(qty_returned), 0) into v_already_returned
    from public.returns where service_item_id = p_service_item_id;

    select avg(hpp_at_time) into v_avg_hpp
    from public.stock_consumptions where service_item_id = p_service_item_id;
  end if;

  v_remaining := v_original_qty - v_already_returned;

  if p_qty_returned > v_remaining then
    raise exception 'Qty retur melebihi sisa yang bisa diretur (%).', v_remaining
      using errcode = '22023';
  end if;

  insert into public.returns (
    transaction_item_id, service_item_id, qty_returned, reason, refund_amount, processed_by
  ) values (
    p_transaction_item_id, p_service_item_id, p_qty_returned, p_reason, p_refund_amount, v_user_id
  )
  returning id into v_return_id;

  if p_restock and v_item_type = 'product' and v_product_id is not null then
    insert into public.inventory_batches (
      product_id, source_type, qty_awal, qty_sisa, harga_beli
    ) values (
      v_product_id, 'adjustment', p_qty_returned, p_qty_returned, coalesce(v_avg_hpp, 0)
    );
  end if;

  if p_refund_amount > 0 then
    insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
    values ('cash', -p_refund_amount, 'return', v_return_id, 'Retur Barang/Jasa');
  end if;

  -- BARU: balikkan profit yang tadinya tercatat untuk unit yang diretur —
  -- dari margin ASLI (harga jual - HPP), TERPISAH dari nominal refund
  -- (yang bisa diedit manual Admin) supaya laporan laba tidak bisa
  -- "dimanipulasi" lewat nominal refund.
  v_profit_reversal := p_qty_returned * (v_price_snapshot - coalesce(v_avg_hpp, 0));

  if v_profit_reversal <> 0 then
    insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
    values ('profit', -v_profit_reversal, 'return', v_return_id, 'Pembalikan Laba - Retur');
  end if;

  return query select v_return_id;
end;
$$;

-- ---------- 4. Backfill data historis ----------
-- Aman dijalankan berkali-kali (dicek via NOT EXISTS), dan tidak akan
-- menyentuh transaksi baru yang sudah dicatat RPC versi baru di atas.

insert into public.financial_ledger (category, amount, reference_type, reference_id, description, created_at)
select
  'profit',
  coalesce(sum(
    ti.price_snapshot * ti.qty - coalesce((
      select sum(sc.qty * sc.hpp_at_time)
      from public.stock_consumptions sc
      where sc.transaction_item_id = ti.id
         or (ti.service_item_id is not null and sc.service_item_id = ti.service_item_id)
    ), 0)
  ), 0),
  'transaction',
  t.id,
  'Laba Penjualan (backfill historis)',
  t.created_at
from public.transactions t
join public.transaction_items ti on ti.transaction_id = t.id
where t.status = 'paid'
  and not exists (
    select 1 from public.financial_ledger fl
    where fl.category = 'profit' and fl.reference_type = 'transaction' and fl.reference_id = t.id
  )
group by t.id, t.created_at;

insert into public.financial_ledger (category, amount, reference_type, reference_id, description, created_at)
select
  'profit',
  -(
    r.qty_returned * (
      coalesce(ti.price_snapshot, si.price_snapshot) -
      coalesce((
        select avg(sc.hpp_at_time)
        from public.stock_consumptions sc
        where sc.transaction_item_id = r.transaction_item_id
           or sc.service_item_id = r.service_item_id
      ), 0)
    )
  ),
  'return',
  r.id,
  'Pembalikan Laba - Retur (backfill historis)',
  r.created_at
from public.returns r
left join public.transaction_items ti on ti.id = r.transaction_item_id
left join public.service_items si on si.id = r.service_item_id
where not exists (
  select 1 from public.financial_ledger fl
  where fl.category = 'profit' and fl.reference_type = 'return' and fl.reference_id = r.id
);