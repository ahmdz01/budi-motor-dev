export interface TransactionListItem {
  id: string;
  customer_name: string | null;
  customer_type_used: string;
  source: 'pos' | 'service';
  total_amount: number;
  payment_method: 'cash' | 'qris' | 'transfer';
  status: 'paid' | 'cancelled';
  created_at: string;
}

export interface TransactionItemDetail {
  id: string;
  item_type: 'product' | 'labor';
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
  subtotal: number;
}

export interface TransactionDetail extends TransactionListItem {
  cashier_name: string;
  amount_received: number | null;
  service_id: string | null;
  items: TransactionItemDetail[];
}
