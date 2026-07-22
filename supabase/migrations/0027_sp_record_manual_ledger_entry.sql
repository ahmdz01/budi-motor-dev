-- ============================================================
-- 0027_sp_record_manual_ledger_entry.sql
-- Langkah 9.2 — Entri Manual Dana Restock/Operasional.
--
-- p_from_cash HANYA relevan untuk restock_deposit/withdrawal —
-- Owner yang menentukan apakah ini transfer internal dari/ke Kas
-- atau modal murni dari luar (lihat penjelasan di chat).
-- operational_expense SELALU mengurangi Kas juga, tanpa opsi.
-- ============================================================

create or replace function public.sp_record_manual_ledger_entry(
  p_entry_type varchar,
  p_amount numeric,
  p_description varchar,
  p_from_cash boolean default false
)
returns table (entry_ids uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_current_restock numeric;
  v_ids uuid[] := array[]::uuid[];
  v_new_id uuid;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Super Admin.'
      using errcode = '42501';
  end if;

  if p_entry_type not in ('restock_deposit', 'restock_withdrawal', 'operational_expense') then
    raise exception 'Jenis entri tidak valid.' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Jumlah harus lebih dari 0.' using errcode = '22023';
  end if;

  if p_description is null or length(trim(p_description)) < 3 then
    raise exception 'Keterangan wajib diisi (minimal 3 karakter).' using errcode = '22023';
  end if;

  if p_entry_type = 'restock_deposit' then
    insert into public.financial_ledger (category, amount, reference_type, description)
    values ('restock', p_amount, 'manual', p_description)
    returning id into v_new_id;
    v_ids := array_append(v_ids, v_new_id);

    if p_from_cash then
      insert into public.financial_ledger (category, amount, reference_type, description)
      values ('cash', -p_amount, 'manual', 'Transfer ke Dana Restock: ' || p_description)
      returning id into v_new_id;
      v_ids := array_append(v_ids, v_new_id);
    end if;

  elsif p_entry_type = 'restock_withdrawal' then
    select coalesce(sum(amount), 0) into v_current_restock
    from public.financial_ledger where category = 'restock';

    if p_amount > v_current_restock then
      raise exception 'Jumlah penarikan melebihi saldo Dana Restock saat ini (%).', v_current_restock
        using errcode = '22023';
    end if;

    insert into public.financial_ledger (category, amount, reference_type, description)
    values ('restock', -p_amount, 'manual', p_description)
    returning id into v_new_id;
    v_ids := array_append(v_ids, v_new_id);

    if p_from_cash then
      insert into public.financial_ledger (category, amount, reference_type, description)
      values ('cash', p_amount, 'manual', 'Transfer dari Dana Restock: ' || p_description)
      returning id into v_new_id;
      v_ids := array_append(v_ids, v_new_id);
    end if;

  else -- operational_expense
    insert into public.financial_ledger (category, amount, reference_type, description)
    values ('operational', -p_amount, 'manual', p_description)
    returning id into v_new_id;
    v_ids := array_append(v_ids, v_new_id);

    insert into public.financial_ledger (category, amount, reference_type, description)
    values ('cash', -p_amount, 'manual', 'Biaya Operasional: ' || p_description)
    returning id into v_new_id;
    v_ids := array_append(v_ids, v_new_id);
  end if;

  return query select v_ids;
end;
$$;

grant execute on function public.sp_record_manual_ledger_entry(varchar, numeric, varchar, boolean) to authenticated;