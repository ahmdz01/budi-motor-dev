import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  PUBLIC_PATHS,
  RESTRICTED_ROUTES,
  ROLE_HOME,
  type RoleCode,
} from '@/shared/constants/roleAccess';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // Belum login, mencoba akses halaman yang butuh login -> lempar ke Login
  if (!user && !isPublicPath && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    const roleCode = user.app_metadata?.role_code as RoleCode | undefined;
    const home = roleCode ? ROLE_HOME[roleCode] : '/dashboard';

    // Sudah login tapi membuka halaman Login -> lempar ke halaman utamanya
    if (isPublicPath) {
      return NextResponse.redirect(new URL(home, request.url));
    }

    // PENTING: prefix match, bukan exact match — supaya sub-halaman
    // seperti /inventory/[id] atau /inventory/new ikut terproteksi
    // aturan yang sama dengan /inventory, tanpa perlu mendaftarkan
    // setiap kombinasi path satu-satu.
    const matchedRoute = Object.keys(RESTRICTED_ROUTES).find(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    );
    const allowedRoles = matchedRoute ? RESTRICTED_ROUTES[matchedRoute] : undefined;

    if (allowedRoles && (!roleCode || !allowedRoles.includes(roleCode))) {
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
