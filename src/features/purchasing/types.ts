export interface PurchaseCartItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface PurchaseListItem {
  id: string;
  purchase_date: string;
  total_amount: number;
  payment_status: PaymentStatus;
  amount_paid: number;
  supplier_name: string;
}

export interface PurchaseItemDetail {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface PurchaseDetail {
  id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  payment_status: PaymentStatus;
  amount_paid: number;
  items: PurchaseItemDetail[];
}

export type DebtStatus = 'unpaid' | 'paid';

export interface SupplierDebt {
  id: string;
  purchase_id: string;
  total_tagihan: number;
  total_dibayar: number;
  sisa_hutang: number;
  due_date: string | null;
  status: DebtStatus;
}