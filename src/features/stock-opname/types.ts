export interface OpnameCartItem {
  productId: string;
  productName: string;
  stokSistem: number;
  stokFisik: number;
  reason: string;
  hargaBeliBaru: number | null;
}

export interface OpnameSessionListItem {
  id: string;
  scope_type: string;
  scope_value: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  item_count: number;
}

export interface OpnameSessionItemDetail {
  id: string;
  product_id: string;
  product_name: string;
  stok_sistem: number;
  stok_fisik: number;
  selisih: number;
  reason: string | null;
}

export interface OpnameSessionDetail {
  id: string;
  scope_type: string;
  scope_value: string | null;
  started_at: string;
  completed_at: string | null;
  status: string;
  items: OpnameSessionItemDetail[];
}
