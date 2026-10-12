
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  PUBLIC_PATHS,
  RESTRICTED_ROUTES,
  ROLE_HOME,
  type RoleCode,
} from '@/shared/constants/roleAccess';

const VALID_ROLE_CODES: ReadonlySet<string> = new Set([
  'owner',
  'admin',
  'kasir',
  'mekanik',
  'super_admin',
]);

function isValidRoleCode(value: unknown): value is RoleCode {
  return typeof value === 'string' && VALID_ROLE_CODES.has(value);
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    const rawRoleCode: unknown = user.app_metadata?.role_code;

    // Pengguna tanpa role aplikasi valid tidak boleh masuk.
    if (!isValidRoleCode(rawRoleCode)) {
      // Usahakan mengakhiri session di Supabase Auth.
      // Pembersihan cookie di bawah tetap dilakukan jika permintaan gagal.
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Jangan biarkan error jaringan melewati pemeriksaan akses.
      }

      const redirectResponse = NextResponse.redirect(
        new URL('/login', request.url),
      );

      // Pertahankan perubahan cookie yang dibuat oleh Supabase SSR.
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }

      // Bersihkan semua cookie session Supabase, termasuk cookie yang
      // dipecah menjadi beberapa bagian.
      const authCookieNames = new Set([
        ...request.cookies.getAll().map((cookie) => cookie.name),
        ...supabaseResponse.cookies.getAll().map((cookie) => cookie.name),
      ]);

      for (const name of authCookieNames) {
        if (name.startsWith('sb-') && name.includes('-auth-token')) {
          redirectResponse.cookies.set(name, '', {
            path: '/',
            maxAge: 0,
            expires: new Date(0),
          });
        }
      }

      return redirectResponse;
    }

    const roleCode = rawRoleCode;
    const home = ROLE_HOME[roleCode];

    if (isPublicPath) {
      return NextResponse.redirect(new URL(home, request.url));
    }

    const matchedRoute = Object.keys(RESTRICTED_ROUTES).find(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    const allowedRoles = matchedRoute
      ? RESTRICTED_ROUTES[matchedRoute]
      : undefined;

    if (allowedRoles && !allowedRoles.includes(roleCode)) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};