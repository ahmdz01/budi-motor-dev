export interface Category {
  id: string;
  name: string;
}

export interface Brand {
  id: string;
  name: string;
}

export interface ProductListItem {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: string | null;
  category_name: string | null;
  brand_id: string | null;
  brand_name: string | null;
  location_label: string | null;
  min_stock: number;
  status: string;
  total_stock: number;
}

export interface ProductPrice {
  price_type: 'general' | 'service' | 'workshop';
  price_value: number;
}

export interface ProductDetail extends ProductListItem {
  prices: ProductPrice[];
}

export interface Supplier {
  id: string;
  name: string;
  phone_number: string | null;
  address: string | null;
  default_payment_term_days: number | null;
  status: string;
}

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  customer_type: 'general' | 'service' | 'workshop';
  address: string | null;
  status: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  police_plate: string | null;
  motor_brand: string | null;
  motor_model: string | null;
  notes: string | null;
}