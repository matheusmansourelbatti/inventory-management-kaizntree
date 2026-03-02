export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export type UnitType = 'kg' | 'g' | 'L' | 'mL' | 'unit';

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  unit: UnitType;
  current_stock: string;
  total_purchased_quantity: string;
  total_purchased_cost: string;
  total_sold_quantity: string;
  total_revenue: string;
  profit: string;
  profit_margin: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  unit: UnitType;
  current_stock: string;
  created_at: string;
}

export interface Stock {
  id: string;
  product: string;
  quantity: string;
  note: string;
  source: 'manual' | 'purchase_order';
  purchase_order_item: string | null;
  created_at: string;
}

export interface OrderItem {
  id?: string;
  product: string;
  product_name?: string;
  quantity: string;
  unit_cost?: string;
  unit_price?: string;
  total_cost?: string;
  total_price?: string;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplier: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes: string;
  items: OrderItem[];
  total_cost: string;
  created_at: string;
  updated_at: string;
}

export interface SalesOrder {
  id: string;
  customer: string;
  reference: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes: string;
  items: OrderItem[];
  total_revenue: string;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  total_revenue: string;
  total_costs: string;
  total_profit: string;
  profit_margin: string | null;
  total_products: number;
  total_purchase_orders: number;
  total_sales_orders: number;
  products: Product[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
