-- ============================================================
-- 0015_sp_stock_opname_adjust.sql
-- RPC Langkah 5.3 — Stock Opname. Satu RPC menangani seluruh
-- sesi (bukan 2 tahap start/complete — lihat penjelasan di chat).
--
-- KEPUTUSAN KUNCI (disetujui pengguna):
-- - stok_sistem SELALU dihitung ulang di server dari
--   current_stock_per_product, TIDAK dipercaya dari input client
--   (hindari race condition dengan penjualan yang berjalan
--   bersamaan).
-- - Selisih negatif: qty_sisa dikurangi FIFO dari inventory_batches
--   aktif, bisa lintas beberapa batch. TIDAK memakai
--   stock_consumptions (constraint XOR di tabel itu tidak
--   mendukung sumber "opname"). adjustment_batch_id menyimpan
--   batch TERAKHIR yang tersentuh; kalau >1 batch, dicatat di
--   kolom reason.
-- - Selisih positif: harga_beli WAJIB diisi manual oleh Admin
--   (p_items[].harga_beli_baru), tidak dihitung otomatis.
-- ============================================================

create or replace function public.sp_stock_opname_adjust(
  p_scope_type varchar(20),
  p_scope_value varchar(100),
  p_items jsonb -- [{product_id, stok_fisik, reason, harga_beli_baru}, ...]
)
returns table (session_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_id uuid;
  v_session_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_stok_fisik integer;
  v_stok_sistem integer;
  v_selisih integer;
  v_reason text;
  v_harga_beli numeric;
  v_new_batch_id uuid;
  v_remaining integer;
  v_batch record;
  v_take integer;
  v_touched_batches integer;
begin
  v_role := auth.jwt() -> 'app_metadata' ->> 'role_code';
  if v_role is null or v_role not in ('owner', 'admin', 'super_admin') then
    raise exception 'Akses ditolak: hanya Owner/Admin/Super Admin.'
      using errcode = '42501';
  end if;

  v_user_id := auth.uid();

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Minimal 1 barang harus dicek.' using errcode = '22023';
  end if;

  insert into public.stock_opname_sessions (
    scope_type, scope_value, started_by, status, completed_at
  ) values (
    coalesce(p_scope_type, 'manual'), p_scope_value, v_user_id, 'completed', now()
  )
  returning id into v_session_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_stok_fisik := (v_item->>'stok_fisik')::integer;
    v_reason := nullif(v_item->>'reason', '');
    v_harga_beli := nullif(v_item->>'harga_beli_baru', '')::numeric;

    if v_stok_fisik < 0 then
      raise exception 'Stok fisik tidak boleh negatif.' using errcode = '22023';
    end if;

    -- Dihitung ULANG di server, bukan dipercaya dari client.
    select coalesce(sum(qty_sisa), 0) into v_stok_sistem
    from public.inventory_batches
    where product_id = v_product_id and status = 'active';

    v_selisih := v_stok_fisik - v_stok_sistem;

    if v_selisih = 0 then
      insert into public.stock_opname_items (
        session_id, product_id, stok_sistem, stok_fisik, reason
      ) values (
        v_session_id, v_product_id, v_stok_sistem, v_stok_fisik, v_reason
      );

    elsif v_selisih > 0 then
      if v_harga_beli is null or v_harga_beli <= 0 then
        raise exception 'Harga beli wajib diisi untuk barang dengan selisih lebih.'
          using errcode = '22023';
      end if;

      insert into public.inventory_batches (
        product_id, source_type, qty_awal, qty_sisa, harga_beli
      ) values (
        v_product_id, 'adjustment', v_selisih, v_selisih, v_harga_beli
      )
      returning id into v_new_batch_id;

      insert into public.stock_opname_items (
        session_id, product_id, stok_sistem, stok_fisik, reason, adjustment_batch_id
      ) values (
        v_session_id, v_product_id, v_stok_sistem, v_stok_fisik, v_reason, v_new_batch_id
      );

    else -- v_selisih < 0
      v_remaining := abs(v_selisih);
      v_new_batch_id := null;
      v_touched_batches := 0;

      for v_batch in
        select id, qty_sisa from public.inventory_batches
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

        v_remaining := v_remaining - v_take;
        v_new_batch_id := v_batch.id;
        v_touched_batches := v_touched_batches + 1;
      end loop;

      if v_remaining > 0 then
        raise exception 'Stok sistem tidak konsisten untuk salah satu barang — batalkan dan coba lagi.'
          using errcode = '22023';
      end if;

      insert into public.stock_opname_items (
        session_id, product_id, stok_sistem, stok_fisik, reason, adjustment_batch_id
      ) values (
        v_session_id, v_product_id, v_stok_sistem, v_stok_fisik,
        case
          when v_touched_batches > 1 then
            coalesce(v_reason || ' — ', '') || 'Dikurangi dari ' || v_touched_batches || ' batch (FIFO).'
          else v_reason
        end,
        v_new_batch_id
      );
    end if;
  end loop;

  return query select v_session_id;
end;
$$;

grant execute on function public.sp_stock_opname_adjust(varchar, varchar, jsonb) to authenticated;