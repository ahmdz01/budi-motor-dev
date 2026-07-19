import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll dipanggil dari Server Component (bukan Server Action/Route Handler).
            // Ini boleh diabaikan JIKA middleware kita (lihat file middleware.ts)
            // sudah menangani refresh session — middleware selalu jalan duluan
            // di setiap request sebelum Server Component dirender.
          }
        },
      },
    }
  );
}
