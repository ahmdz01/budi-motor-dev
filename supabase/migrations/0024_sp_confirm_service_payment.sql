-- ============================================================
-- 0024_sp_confirm_service_payment.sql
-- Langkah 7.5 — Konfirmasi Pembayaran Servis. Penutup rangkaian
-- Phase 7: servis 'completed' -> 'paid', dan baru DI SINI record
-- juga dibuat di transactions (source='service') — Source of
-- Truth omzet tunggal, sesuai prinsip yang disepakati sejak awal.
--
-- TIDAK ada konsumsi stok di sini — sudah selesai di
-- sp_add_service_item (7.3). Di sini cuma menyalin service_items
-- ke transaction_items untuk bukti transaksi (traceability via
-- service_item_id, kolom yang memang sudah disiapkan skema untuk
-- keperluan ini).
-- ============================================================

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

  -- IDEMPOTENCY CHECK.
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
  end loop;

  update public.services set status = 'paid' where id = p_service_id;

  insert into public.service_status_history (service_id, status_from, status_to, changed_by, reason)
  values (p_service_id, 'completed', 'paid', v_user_id, 'Pembayaran dikonfirmasi.');

  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('cash', v_total, 'transaction', v_transaction_id, 'Pembayaran Servis');

  return query select v_transaction_id, v_total, v_change;
end;
$$;

grant execute on function public.sp_confirm_service_payment(uuid, uuid, varchar, numeric) to authenticated;