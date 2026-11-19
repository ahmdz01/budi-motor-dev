-- S11: Enforce cashier ownership inside SECURITY DEFINER service-payment
-- and return RPCs. This migration is prepared for local review only;
-- do not apply to Production until the complete S11 review is approved.

CREATE OR REPLACE FUNCTION public.sp_confirm_service_payment(
  p_service_id uuid,
  p_client_uuid uuid,
  p_payment_method character varying,
  p_amount_received numeric DEFAULT NULL::numeric
)
RETURNS TABLE(transaction_id uuid, total_amount numeric, change_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  if v_user_id is null then
    raise exception 'Identitas pengguna tidak tersedia.' using errcode = '42501';
  end if;

  -- Lock the service before checking idempotency. This serializes concurrent
  -- payment attempts for the same service, so a second caller re-reads the
  -- transaction created by the first caller instead of racing the unique index.
  select s.id, s.status, s.customer_id, s.customer_type_used
  into v_service
  from public.services s
  where s.id = p_service_id
  for update;

  if not found then
    raise exception 'Servis tidak ditemukan.' using errcode = '22023';
  end if;

  -- A cashier may receive an idempotent result only for a service payment
  -- originally processed by that same cashier.
  select t.id, t.total_amount, t.amount_received, t.cashier_id
  into v_existing
  from public.transactions t
  where t.service_id = p_service_id
    and t.source = 'service';

  if found then
    if v_role = 'kasir'
       and v_existing.cashier_id is distinct from v_user_id then
      raise exception 'Akses ditolak: pembayaran servis diproses oleh kasir lain.'
        using errcode = '42501';
    end if;

    return query select
      v_existing.id,
      v_existing.total_amount,
      coalesce(v_existing.amount_received, 0) - v_existing.total_amount;
    return;
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

    -- Labor has zero COGS; product COGS comes from consumption records
    -- created when the service item was added.
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

  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('profit', v_total - v_total_cogs, 'transaction', v_transaction_id, 'Laba Servis');

  return query select v_transaction_id, v_total, v_change;
end;
$function$;


CREATE OR REPLACE FUNCTION public.sp_process_return(
  p_qty_returned integer,
  p_reason character varying,
  p_refund_amount numeric,
  p_transaction_item_id uuid DEFAULT NULL::uuid,
  p_service_item_id uuid DEFAULT NULL::uuid,
  p_restock boolean DEFAULT true
)
RETURNS TABLE(return_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_cashier_id uuid;
  v_service_id uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';

  if v_role is null
     or v_role not in ('owner', 'admin', 'kasir', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Kasir/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Identitas pengguna tidak tersedia.' using errcode = '42501';
  end if;

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
      t.status,
      t.cashier_id
    into
      v_item_type,
      v_product_id,
      v_original_qty,
      v_price_snapshot,
      v_parent_status,
      v_cashier_id
    from public.transaction_items ti
    join public.transactions t on t.id = ti.transaction_id
    where ti.id = p_transaction_item_id
    for update of ti, t;

    if not found then
      raise exception 'Item transaksi tidak ditemukan.'
        using errcode = '22023';
    end if;

    -- Cashiers may return only items from transactions they processed.
    if v_role = 'kasir'
       and v_cashier_id is distinct from v_user_id then
      raise exception 'Akses ditolak: transaksi ditangani oleh kasir lain.'
        using errcode = '42501';
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
      si.service_id,
      si.item_type,
      si.product_id,
      si.qty,
      si.price_snapshot,
      s.status
    into
      v_service_id,
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

    -- A service return must be tied to the service-payment transaction.
    -- A cashier may process it only when that payment was handled by them.
    if v_role = 'kasir' then
      select t.cashier_id
      into v_cashier_id
      from public.transactions t
      where t.service_id = v_service_id
        and t.source = 'service'
      for update;

      if not found then
        raise exception 'Transaksi pembayaran servis tidak ditemukan.'
          using errcode = '42501';
      end if;

      if v_cashier_id is distinct from v_user_id then
        raise exception 'Akses ditolak: pembayaran servis ditangani oleh kasir lain.'
          using errcode = '42501';
      end if;
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
   * Refund ceiling:
   * 1. No more than the original price for the quantity being returned.
   * 2. Cumulative refunds cannot exceed the value of all returned units.
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

  -- Preserve the existing profit-reversal accounting behavior.
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
$function$;
