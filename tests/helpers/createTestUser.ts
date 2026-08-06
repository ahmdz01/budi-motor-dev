import { supabaseAdmin, createAnonClient } from './supabaseTestClients';

type RoleCode = 'owner' | 'admin' | 'kasir' | 'mekanik' | 'super_admin';

interface TestUserOptions {
  roleCode: RoleCode;
  name?: string;
}

export async function createTestUser({ roleCode, name = 'Test User' }: TestUserOptions) {
  // Tambah suffix acak — Date.now() saja berisiko bentrok kalau
  // beberapa test file kebetulan jalan di detik yang sama.
  const phoneNumber = `0000${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const pin = '1234';
  const email = `${phoneNumber}@budimotor.internal`;
  const password = `${pin}-bm`;

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role_code: roleCode },
  });

  if (authError || !authUser.user) {
    // JSON.stringify supaya kalau kejadian lagi, pesannya lebih jelas
    // dari sekadar authError?.message yang kadang kosong.
    throw new Error(`Gagal membuat test user: ${JSON.stringify(authError)}`);
  }

  const { error: profileError } = await supabaseAdmin.from('users').insert({
    id: authUser.user.id,
    phone_number: phoneNumber,
    name,
    role_code: roleCode,
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Gagal membuat profil test user: ${profileError.message}`);
  }

  const client = createAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });

  if (signInError) {
    throw new Error(`Gagal login sebagai test user: ${signInError.message}`);
  }

  return {
    userId: authUser.user.id,
    client,
    async cleanup() {
      await supabaseAdmin.from('users').delete().eq('id', authUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    },
  };
}