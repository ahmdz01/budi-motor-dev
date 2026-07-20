import { create } from 'zustand';

interface UiPreferencesState {
  isCompactMode: boolean;
  toggleCompactMode: () => void;
}

/**
 * Contoh pola Zustand store untuk CLIENT STATE murni (bukan data
 * dari server). Store nyata pertama yang benar-benar terpakai
 * untuk kebutuhan bisnis adalah usePosCartStore di Phase 6 (POS)
 * — mengikuti pola yang sama persis dengan file ini.
 *
 * Kenapa belum dibuat sekarang (bukan lupa): keranjang POS punya
 * business rules (BR-POS-01 dst) yang baru relevan saat modul
 * POS benar-benar dikerjakan — membuatnya sekarang berarti
 * menebak-nebak struktur yang belum pasti, melanggar YAGNI.
 */
export const useUiPreferencesStore = create<UiPreferencesState>((set) => ({
  isCompactMode: false,
  toggleCompactMode: () => set((state) => ({ isCompactMode: !state.isCompactMode })),
}));
