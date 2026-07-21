import { create } from 'zustand';

export type CustomerTypeUsed = 'general' | 'service' | 'workshop';

export interface CartItem {
  productId: string;
  productName: string;
  priceSnapshot: number;
  qty: number;
  stockAvailable: number;
}

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  customerTypeUsed: CustomerTypeUsed;
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customer: { id: string; name: string } | null) => void;
  setCustomerTypeUsed: (type: CustomerTypeUsed) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: null,
  customerName: null,
  customerTypeUsed: 'general',

  addItem: (item) => {
    const existing = get().items.find((i) => i.productId === item.productId);

    if (existing) {
      set({
        items: get().items.map((i) =>
          i.productId === item.productId
            ? { ...i, qty: Math.min(i.qty + item.qty, i.stockAvailable) }
            : i
        ),
      });
    } else {
      set({ items: [...get().items, item] });
    }
  },

  updateQty: (productId, qty) => {
    set({
      items: get()
        .items.map((i) => (i.productId === productId ? { ...i, qty } : i))
        .filter((i) => i.qty > 0),
    });
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.productId !== productId) });
  },

  setCustomer: (customer) => {
    set({ customerId: customer?.id ?? null, customerName: customer?.name ?? null });
  },

  // Ganti tipe pelanggan mengosongkan keranjang — harga tiap barang
  // sudah snapshot sesuai tipe lama saat ditambahkan, jadi tidak
  // konsisten kalau dipertahankan setelah tipe berubah.
  setCustomerTypeUsed: (type) => {
    set({ customerTypeUsed: type, items: [] });
  },

  clear: () =>
    set({ items: [], customerId: null, customerName: null, customerTypeUsed: 'general' }),
}));
