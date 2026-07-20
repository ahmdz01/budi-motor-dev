-- ============================================================
-- 0014_sp_record_purchase.sql
-- RPC utama Langkah 5.1 — Barang Masuk. Menyentuh 4 tabel
-- finansial inti sekaligus (purchases, purchase_items,
-- inventory_batches, supplier_debts) + financial_ledger, jadi
-- WAJIB lewat RPC SECURITY DEFINER dengan cek role eksplisit
-- (pola sama seperti get_dashboard_metrics, Langkah 3).
--
-- KEPUTUSAN KUNCI: hanya nominal yang BENAR-BENAR dibayar saat
-- transaksi (p_amount_paid) yang mengurangi Dana Restock via
-- financial_ledger kategori 'restock'. Sisa yang belum dibayar
-- tercatat sebagai supplier_debts dan baru mengurangi Dana
-- Restock nanti saat dilunasi (RPC sp_pay_supplier_debt,
-- Langkah 5.2) — supaya saldo Dana Restock selalu mencerminkan
-- uang yang benar-benar sudah keluar, bukan komitmen di masa depan.
-- ============================================================

create or replace function public.sp_record_purchase(
  p_client_uuid uuid,
  p_supplier_id uuid,
  p_purchase_date date,
  p_items jsonb, -- [{product_id, qty, unit_price}, ...]
  p_amount_paid numeric,
  p_due_date date default null
)
returns table (purchase_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_total numeric := 0;
  v_purchase_id uuid;
  v_payment_status varchar(20);
  v_item jsonb;
  v_purchase_item_id uuid;
  v_supplier_term smallint;
  v_due_date date;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal 1 barang harus diisi.' using errcode = '22023';
  end if;

  select coalesce(sum((item->>'qty')::integer * (item->>'unit_price')::numeric), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'Total pembelian harus lebih dari 0.' using errcode = '22023';
  end if;

  if p_amount_paid < 0 or p_amount_paid > v_total then
    raise exception 'Jumlah dibayar tidak valid.' using errcode = '22023';
  end if;

  v_payment_status := case
    when p_amount_paid >= v_total then 'paid'
    when p_amount_paid > 0 then 'partial'
    else 'unpaid'
  end;

  insert into public.purchases (
    client_uuid, supplier_id, purchase_date, total_amount,
    payment_status, amount_paid, created_by
  ) values (
    p_client_uuid, p_supplier_id, p_purchase_date, v_total,
    v_payment_status, p_amount_paid, v_user_id
  )
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.purchase_items (purchase_id, product_id, qty, unit_price)
    values (
      v_purchase_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'qty')::integer,
      (v_item->>'unit_price')::numeric
    )
    returning id into v_purchase_item_id;

    insert into public.inventory_batches (
      product_id, purchase_item_id, source_type, qty_awal, qty_sisa, harga_beli
    ) values (
      (v_item->>'product_id')::uuid,
      v_purchase_item_id,
      'purchase',
      (v_item->>'qty')::integer,
      (v_item->>'qty')::integer,
      (v_item->>'unit_price')::numeric
    );
  end loop;

  if v_payment_status <> 'paid' then
    select default_payment_term_days into v_supplier_term
    from public.suppliers where id = p_supplier_id;

    v_due_date := coalesce(p_due_date, p_purchase_date + coalesce(v_supplier_term, 0));

    insert into public.supplier_debts (
      purchase_id, supplier_id, total_tagihan, total_dibayar, due_date
    ) values (
      v_purchase_id, p_supplier_id, v_total, p_amount_paid, v_due_date
    );
  end if;

  if p_amount_paid > 0 then
    insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
    values (
      'restock', -p_amount_paid, 'purchase', v_purchase_id, 'Pembayaran Barang Masuk'
    );
  end if;

  return query select v_purchase_id;
end;
$$;

grant execute on function public.sp_record_purchase(uuid, uuid, date, jsonb, numeric, date) to authenticated;