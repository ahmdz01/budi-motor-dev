-- ============================================================
-- 0015_sp_pay_supplier_debt.sql
-- Langkah 5.2 — Pembayaran Hutang Supplier. Row lock (FOR UPDATE)
-- WAJIB di sini — dua pembayaran bersamaan pada hutang yang sama
-- harus antre, bukan saling menimpa (sama prinsipnya dengan
-- locking FIFO batch).
-- ============================================================

create or replace function public.sp_pay_supplier_debt(
  p_debt_id uuid,
  p_amount numeric,
  p_payment_method varchar default 'cash'
)
returns table (remaining numeric, new_status varchar)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_purchase_id uuid;
  v_total_tagihan numeric;
  v_total_dibayar numeric;
  v_sisa numeric;
  v_new_total_dibayar numeric;
  v_new_status varchar(20);
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if p_payment_method not in ('cash', 'transfer') then
    raise exception 'Metode pembayaran tidak valid.' using errcode = '22023';
  end if;

  if p_amount <= 0 then
    raise exception 'Nominal pembayaran harus lebih dari 0.' using errcode = '22023';
  end if;

  -- Row lock: mencegah race condition dua pembayaran bersamaan
  -- pada hutang yang sama.
  select purchase_id, total_tagihan, total_dibayar, sisa_hutang
  into v_purchase_id, v_total_tagihan, v_total_dibayar, v_sisa
  from public.supplier_debts
  where id = p_debt_id
  for update;

  if not found then
    raise exception 'Data hutang tidak ditemukan.' using errcode = 'P0002';
  end if;

  if p_amount > v_sisa then
    raise exception 'Nominal melebihi sisa hutang yang tercatat.' using errcode = '22023';
  end if;

  v_new_total_dibayar := v_total_dibayar + p_amount;
  v_new_status := case when v_new_total_dibayar >= v_total_tagihan then 'paid' else 'unpaid' end;

  update public.supplier_debts
  set total_dibayar = v_new_total_dibayar,
      status = v_new_status
  where id = p_debt_id;

  insert into public.supplier_debt_payments (supplier_debt_id, amount, payment_method, paid_by)
  values (p_debt_id, p_amount, p_payment_method, v_user_id);

  insert into public.financial_ledger (category, amount, reference_type, reference_id, description)
  values ('restock', -p_amount, 'purchase', v_purchase_id, 'Pembayaran Hutang Supplier');

  return query select (v_total_tagihan - v_new_total_dibayar), v_new_status;
end;
$$;

grant execute on function public.sp_pay_supplier_debt(uuid, numeric, varchar) to authenticated;