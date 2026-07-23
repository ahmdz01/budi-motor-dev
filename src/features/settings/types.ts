export interface StoreSettings {
  id: string;
  store_name: string;
  address: string | null;
  phone_number: string | null;
  stock_opname_threshold_percent: number;
  large_transaction_threshold: number;
}
