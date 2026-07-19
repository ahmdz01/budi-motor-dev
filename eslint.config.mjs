import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

// CATATAN SEMENTARA:
// Kita tidak memakai eslint-config-next (next/core-web-vitals, next/typescript)
// untuk saat ini karena eslint-config-next@16.x belum mendukung versi ESLint
// terbaru, dan jembatan FlatCompat yang dipakai untuk menerjemahkannya
// bermasalah dengan plugin flat-config modern (bug circular reference).
// Sebagai gantinya kita pakai typescript-eslint secara native (flat config asli,
// tanpa jembatan). Aturan Next.js-specific (next/image, dsb) akan diaktifkan
// kembali di awal Langkah 4 setelah eslint-config-next merilis dukungan resmi.
const eslintConfig = tseslint.config(
  {
    // Folder yang TIDAK BOLEH di-lint sama sekali — hasil build,
    // dependency pihak ketiga, dan file generated otomatis.
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'prefer-const': 'error',
    },
  }
);

export default eslintConfig;
