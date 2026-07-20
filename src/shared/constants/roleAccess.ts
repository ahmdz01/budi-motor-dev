export type RoleCode = 'owner' | 'admin' | 'kasir' | 'mekanik' | 'super_admin';

/**
 * Halaman utama yang dituju masing-masing role setelah login,
 * dan tujuan redirect saat role tidak berhak akses suatu halaman.
 * Sesuai Screen Specification: Kasir -> POS, Mekanik -> Servis,
 * role lain -> Dashboard.
 */
export const ROLE_HOME: Record<RoleCode, string> = {
  owner: '/dashboard',
  admin: '/dashboard',
  super_admin: '/dashboard',
  kasir: '/pos',
  mekanik: '/service',
};

/**
 * Peta path -> role yang boleh mengakses, sesuai matriks akses
 * di Data Dictionary v3 & Screen Specification.
 *
 * Path yang TIDAK terdaftar di sini dianggap boleh diakses oleh
 * siapa pun yang sudah login (default-allow untuk path netral) —
 * ini sengaja, supaya kita tidak wajib mendaftarkan setiap path
 * baru satu-satu (YAGNI: baru dibatasi kalau memang perlu dibatasi).
 */
export const RESTRICTED_ROUTES: Record<string, RoleCode[]> = {
  '/dashboard': ['owner', 'admin', 'super_admin'],
  '/inventory': ['owner', 'admin', 'super_admin'],
  '/suppliers': ['owner', 'admin', 'super_admin'],
  '/customers': ['owner', 'admin', 'super_admin'],
  '/more': ['owner', 'admin', 'super_admin'],
  '/pos': ['owner', 'admin', 'kasir', 'super_admin'],
  '/service': ['owner', 'admin', 'kasir', 'mekanik', 'super_admin'],
  '/purchases': ['owner', 'admin', 'super_admin'],
};

export const PUBLIC_PATHS = ['/login', '/forgot-pin'];
