-- ============================================================
-- 0019_pos_transaction_idempotency.sql
-- Langkah 6.3 — tambahan idempotency check di awal function.
-- Kalau client_uuid sudah pernah diproses (retry sync setelah
-- app sempat tertutup di tengah proses, dsb), kembalikan hasil
-- yang SUDAH ADA — bukan mencoba insert lagi dan gagal karena
-- UNIQUE constraint (BR-SYNC-01).
-- ============================================================

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
  v_existing record;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin.'
      using errcode = '42501';
  end if;

  -- IDEMPOTENCY CHECK — baru ditambahkan Langkah 6.3.
  select id, total_amount, amount_received
  into v_existing
  from public.transactions
  where client_uuid = p_client_uuid;

  if found then
    return query select
      v_existing.id,
      v_existing.total_amount,
      coalesce(v_existing.amount_received, 0) - v_existing.total_amount;
    return;
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

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'Stok tidak cukup untuk salah satu barang saat transaksi diproses.'
        using errcode = '22023';
    end if;
  end loop;

  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('cash', v_total, 'transaction', v_transaction_id, 'Penjualan POS');

  return query select v_transaction_id, v_total, v_change;
end;
$$;

grant execute on function public.sp_create_pos_transaction(uuid, uuid, varchar, jsonb, varchar, numeric) to authenticated;