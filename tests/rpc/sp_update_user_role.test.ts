import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser } from '../helpers/createTestUser';
import { supabaseAdmin } from '../helpers/supabaseTestClients';

describe('sp_update_user_role', () => {
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let admin: Awaited<ReturnType<typeof createTestUser>>;
  let staffA: Awaited<ReturnType<typeof createTestUser>>;
  let staffB: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    owner = await createTestUser({ roleCode: 'owner', name: 'Test Owner' });
    admin = await createTestUser({ roleCode: 'admin', name: 'Test Admin' });
    staffA = await createTestUser({ roleCode: 'kasir', name: 'Test Staff A' });
    staffB = await createTestUser({ roleCode: 'mekanik', name: 'Test Staff B' });
  });

  afterAll(async () => {
    await supabaseAdmin.from('audit_logs').delete().eq('entity_type', 'user_role');
    await staffB.cleanup();
    await staffA.cleanup();
    await admin.cleanup();
    await owner.cleanup();
  });

  it('Owner bisa ubah role staff apapun, dan TERCATAT di audit_logs', async () => {
    const { error } = await owner.client.rpc('sp_update_user_role', {
      p_user_id: staffA.userId,
      p_new_role: 'admin',
    });

    expect(error).toBeNull();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role_code')
      .eq('id', staffA.userId)
      .single();
    expect(user!.role_code).toBe('admin');

    const { data: audit } = await supabaseAdmin
      .from('audit_logs')
      .select('old_value, new_value, user_id')
      .eq('entity_type', 'user_role')
      .eq('entity_id', staffA.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(audit!.user_id).toBe(owner.userId);
    expect((audit!.old_value as { role_code: string }).role_code).toBe('kasir');
    expect((audit!.new_value as { role_code: string }).role_code).toBe('admin');

    // Kembalikan role staffA supaya tidak mengganggu test lain di file ini.
    await owner.client.rpc('sp_update_user_role', {
      p_user_id: staffA.userId,
      p_new_role: 'kasir',
    });
  });

  it('Admin HANYA BOLEH ubah role Kasir/Mekanik, tidak boleh jadikan Admin/Owner', async () => {
    const { error } = await admin.client.rpc('sp_update_user_role', {
      p_user_id: staffB.userId,
      p_new_role: 'admin',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('hanya boleh mengubah role akun Kasir/Mekanik');
  });

  it('Admin BOLEH ubah role antar Kasir/Mekanik', async () => {
    const { error } = await admin.client.rpc('sp_update_user_role', {
      p_user_id: staffB.userId,
      p_new_role: 'kasir',
    });

    expect(error).toBeNull();

    // Kembalikan.
    await admin.client.rpc('sp_update_user_role', {
      p_user_id: staffB.userId,
      p_new_role: 'mekanik',
    });
  });

  it('TIDAK BOLEH ubah role akun sendiri (Critical C8)', async () => {
    const { error } = await owner.client.rpc('sp_update_user_role', {
      p_user_id: owner.userId,
      p_new_role: 'admin',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Tidak bisa mengubah role akun sendiri');
  });

  it('Role tidak valid ditolak', async () => {
    const { error } = await owner.client.rpc('sp_update_user_role', {
      p_user_id: staffA.userId,
      p_new_role: 'superhero',
    });

    expect(error).not.toBeNull();
    expect(error!.message).toContain('Role tidak valid');
  });
});