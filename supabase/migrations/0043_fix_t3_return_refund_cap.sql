
begin;

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
  v_already_refunded numeric := 0;
  v_remaining integer;
  v_avg_hpp numeric;
  v_profit_reversal numeric;
  v_max_refund numeric;
  v_large_transaction_threshold numeric := 500000;
  v_return_id uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';

  if v_role is null
     or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if (p_transaction_item_id is null) = (p_service_item_id is null) then
    raise exception
      'Retur harus merujuk tepat satu item transaksi atau item servis.'
      using errcode = '22023';
  end if;

  if p_qty_returned is null or p_qty_returned <= 0 then
    raise exception 'Qty retur harus lebih dari 0.'
      using errcode = '22023';
  end if;

  if p_refund_amount is null or p_refund_amount < 0 then
    raise exception 'Jumlah refund tidak boleh kosong atau negatif.'
      using errcode = '22023';
  end if;

  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'Alasan retur wajib diisi (minimal 3 karakter).'
      using errcode = '22023';
  end if;

  if p_transaction_item_id is not null then
    select
      ti.item_type,
      ti.product_id,
      ti.qty,
      ti.price_snapshot,
      t.status
    into
      v_item_type,
      v_product_id,
      v_original_qty,
      v_price_snapshot,
      v_parent_status
    from public.transaction_items ti
    join public.transactions t on t.id = ti.transaction_id
    where ti.id = p_transaction_item_id
    for update of ti;

    if not found then
      raise exception 'Item transaksi tidak ditemukan.'
        using errcode = '22023';
    end if;

    if v_parent_status <> 'paid' then
      raise exception 'Transaksi ini tidak berstatus Lunas.'
        using errcode = '22023';
    end if;

    select
      coalesce(sum(r.qty_returned), 0),
      coalesce(sum(r.refund_amount), 0)
    into v_already_returned, v_already_refunded
    from public.returns r
    where r.transaction_item_id = p_transaction_item_id;

    select avg(sc.hpp_at_time)
    into v_avg_hpp
    from public.stock_consumptions sc
    where sc.transaction_item_id = p_transaction_item_id;

  else
    select
      si.item_type,
      si.product_id,
      si.qty,
      si.price_snapshot,
      s.status
    into
      v_item_type,
      v_product_id,
      v_original_qty,
      v_price_snapshot,
      v_parent_status
    from public.service_items si
    join public.services s on s.id = si.service_id
    where si.id = p_service_item_id
    for update of si;

    if not found then
      raise exception 'Item servis tidak ditemukan.'
        using errcode = '22023';
    end if;

    if v_parent_status <> 'paid' then
      raise exception 'Servis ini belum Lunas.'
        using errcode = '22023';
    end if;

    select
      coalesce(sum(r.qty_returned), 0),
      coalesce(sum(r.refund_amount), 0)
    into v_already_returned, v_already_refunded
    from public.returns r
    where r.service_item_id = p_service_item_id;

    select avg(sc.hpp_at_time)
    into v_avg_hpp
    from public.stock_consumptions sc
    where sc.service_item_id = p_service_item_id;
  end if;

  if v_price_snapshot is null or v_price_snapshot < 0 then
    raise exception 'Harga asli item tidak valid untuk diproses retur.'
      using errcode = '22023';
  end if;

  v_remaining := v_original_qty - v_already_returned;

  if p_qty_returned > v_remaining then
    raise exception 'Qty retur melebihi sisa yang bisa diretur (%).',
      v_remaining
      using errcode = '22023';
  end if;

  /*
   * Batas refund:
   * 1. Tidak melebihi harga asli dari qty yang sedang diretur.
   * 2. Total refund kumulatif tidak melebihi nilai semua qty
   *    yang sudah dan sedang diretur.
   */
  v_max_refund := greatest(
    0,
    least(
      p_qty_returned::numeric * v_price_snapshot,
      (v_already_returned + p_qty_returned)::numeric
        * v_price_snapshot - v_already_refunded
    )
  );

  if p_refund_amount > v_max_refund then
    raise exception
      'Jumlah refund melebihi batas maksimal retur ini. Maksimal yang diizinkan: Rp %.',
      to_char(v_max_refund, 'FM999999999999990.00')
      using errcode = '22023';
  end if;

  /*
   * Ambil ambang transaksi besar dari pengaturan toko.
   * Jika belum ada baris konfigurasi, gunakan default Rp500.000.
   */
  select ss.large_transaction_threshold
  into v_large_transaction_threshold
  from public.store_settings ss
  order by ss.updated_at desc
  limit 1;

  v_large_transaction_threshold :=
    coalesce(v_large_transaction_threshold, 500000);

  if p_refund_amount > v_large_transaction_threshold
     and v_role not in ('owner', 'admin', 'super_admin') then
    raise exception
      'Refund melebihi batas transaksi besar. Minta Owner, Admin, atau Super Admin memprosesnya.'
      using errcode = '42501';
  end if;

  insert into public.returns (
    transaction_item_id,
    service_item_id,
    qty_returned,
    reason,
    refund_amount,
    processed_by
  )
  values (
    p_transaction_item_id,
    p_service_item_id,
    p_qty_returned,
    p_reason,
    p_refund_amount,
    v_user_id
  )
  returning id into v_return_id;

  if p_restock and v_item_type = 'product'
     and v_product_id is not null then
    insert into public.inventory_batches (
      product_id,
      source_type,
      qty_awal,
      qty_sisa,
      harga_beli
    )
    values (
      v_product_id,
      'adjustment',
      p_qty_returned,
      p_qty_returned,
      coalesce(v_avg_hpp, 0)
    );
  end if;

  if p_refund_amount > 0 then
    insert into public.financial_ledger (
      category,
      amount,
      reference_type,
      reference_id,
      description
    )
    values (
      'cash',
      -p_refund_amount,
      'return',
      v_return_id,
      'Retur Barang/Jasa'
    );
  end if;

  -- Pertahankan pembalikan laba dari definisi 0026.
  v_profit_reversal :=
    p_qty_returned * (v_price_snapshot - coalesce(v_avg_hpp, 0));

  if v_profit_reversal <> 0 then
    insert into public.financial_ledger (
      category,
      amount,
      reference_type,
      reference_id,
      description
    )
    values (
      'profit',
      -v_profit_reversal,
      'return',
      v_return_id,
      'Pembalikan Laba - Retur'
    );
  end if;

  return query select v_return_id;
end;
$$;

revoke all on function public.sp_process_return(
  integer, varchar, numeric, uuid, uuid, boolean
) from public, anon;

grant execute on function public.sp_process_return(
  integer, varchar, numeric, uuid, uuid, boolean
) to authenticated;

commit;