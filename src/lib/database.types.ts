// ============================================================
// Auto-generated TypeScript types from Supabase schema
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── ENUM TYPES ────────────────────────────────────────────
export type UserRole        = 'admin' | 'client'
export type OrderStatus     = 'pending' | 'awaiting_payment' | 'paid' | 'in_delivery' | 'delivered' | 'cancelled'
export type PaymentMethod   = 'card' | 'transfer'
export type PaymentStatus   = 'pending' | 'approved' | 'rejected'
export type MovementType    = 'in' | 'out' | 'adjustment'

// ─── SHARED ACTION RESULT ──────────────────────────────────
export type ActionResult<T = null> =
  | { success: true;  data: T;       error?: never }
  | { success: false; error: string; data?: never  }

// ─── TABLE ROW TYPES ───────────────────────────────────────

export interface Profile {
  id:            string
  full_name:     string
  email:         string
  phone:         string | null
  role:          UserRole
  business_name: string | null
  tax_id:        string | null
  address:       string | null
  is_active:     boolean
  created_at:    string
  updated_at:    string
}

export interface Product {
  id:             string
  name:           string
  description:    string | null
  flavor:         string
  price_per_unit: number
  unit_label:     string
  stock:          number
  min_stock:      number
  image_url:      string | null
  is_active:      boolean
  created_at:     string
  updated_at:     string
}

export interface Order {
  id:            string
  client_id:     string
  status:        OrderStatus
  total_amount:  number
  notes:         string | null
  delivery_date: string | null
  created_at:    string
  updated_at:    string
}

export interface OrderItem {
  id:         string
  order_id:   string
  product_id: string
  quantity:   number
  unit_price: number
  subtotal:   number            // generated column
  created_at: string
}

export interface Payment {
  id:                string
  order_id:          string
  client_id:         string
  method:            PaymentMethod
  amount:            number
  status:            PaymentStatus
  card_last4:        string | null
  card_holder:       string | null
  gateway_response:  Json | null
  voucher_url:       string | null
  voucher_reference: string | null
  admin_notes:       string | null
  reviewed_by:       string | null
  reviewed_at:       string | null
  created_at:        string
  updated_at:        string
}

export interface InventoryMovement {
  id:             string
  product_id:     string
  movement_type:  MovementType
  quantity:       number
  stock_before:   number
  stock_after:    number
  reference_id:   string | null
  reference_type: string | null
  notes:          string | null
  created_by:     string | null
  created_at:     string
}

export interface ProductionRecord {
  id:          string
  product_id:  string
  quantity:    number
  batch_notes: string | null
  produced_at: string
  created_by:  string
  created_at:  string
}

export interface DeliveryEvent {
  id:         string
  order_id:   string
  status:     'in_delivery' | 'delivered'
  notes:      string | null
  changed_by: string | null
  created_at: string
  admin_name?: string   // enriched client-side
}

// ─── JOIN / VIEW TYPES ─────────────────────────────────────

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { product: Product })[]
  profile:     Profile
}

export interface PaymentWithOrder extends Payment {
  order:   Order
  profile: Profile
}

export interface ProductionRecordWithProduct extends ProductionRecord {
  product: Product
}

// ─── FORM / MUTATION TYPES ────────────────────────────────

export interface CreateOrderItem {
  product_id: string
  quantity:   number
  unit_price: number
}

export interface CreateOrderPayload {
  client_id:     string
  notes?:        string
  delivery_date?: string
  items:         CreateOrderItem[]
}

export interface CreatePaymentPayload {
  order_id:           string
  method:             PaymentMethod
  amount:             number
  card_last4?:        string
  card_holder?:       string
  voucher_url?:       string
  voucher_reference?: string
}

export interface CreateProductionPayload {
  product_id:   string
  quantity:     number
  batch_notes?: string
  produced_at:  string
}

// ─── DASHBOARD STATS ──────────────────────────────────────

export interface DashboardStats {
  total_revenue:      number
  total_orders:       number
  orders_this_month:  number
  revenue_this_month: number
  top_products:       { product_id: string; name: string; total_sold: number; revenue: number }[]
  top_clients:        { client_id: string; business_name: string; total_orders: number; total_spent: number }[]
  orders_by_status:   { status: OrderStatus; count: number }[]
  low_stock_products: Product[]
}

// ─── SUPABASE DATABASE TYPE MAP ────────────────────────────
// Matches what Supabase actually generates: Insert = all columns
// optional except required NOT NULL without DEFAULT columns.
// Update = all columns partial.

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id:             string                  // required (references auth.users)
          full_name:      string
          email:          string
          phone?:         string | null
          role?:          UserRole
          business_name?: string | null
          tax_id?:        string | null
          address?:       string | null
          is_active?:     boolean
          created_at?:    string
          updated_at?:    string
        }
        Update: Partial<Omit<Profile, 'id'>>
      }
      products: {
        Row: Product
        Insert: {
          id?:             string
          name:            string
          description?:    string | null
          flavor:          string
          price_per_unit:  number
          unit_label?:     string
          stock?:          number
          min_stock?:      number
          image_url?:      string | null
          is_active?:      boolean
          created_at?:     string
          updated_at?:     string
        }
        Update: Partial<Omit<Product, 'id'>>
      }
      orders: {
        Row: Order
        Insert: {
          id?:            string
          client_id:      string
          status?:        OrderStatus
          total_amount?:  number
          notes?:         string | null
          delivery_date?: string | null
          created_at?:    string
          updated_at?:    string
        }
        Update: Partial<Omit<Order, 'id'>>
      }
      order_items: {
        Row: OrderItem
        Insert: {
          id?:         string
          order_id:    string
          product_id:  string
          quantity:    number
          unit_price:  number
          created_at?: string
          // subtotal is a generated column — must NOT be in Insert
        }
        Update: Partial<Pick<OrderItem, 'quantity' | 'unit_price'>>
      }
      payments: {
        Row: Payment
        Insert: {
          id?:                string
          order_id:           string
          client_id:          string
          method:             PaymentMethod
          amount:             number
          status?:            PaymentStatus
          card_last4?:        string | null
          card_holder?:       string | null
          gateway_response?:  Json | null
          voucher_url?:       string | null
          voucher_reference?: string | null
          admin_notes?:       string | null
          reviewed_by?:       string | null
          reviewed_at?:       string | null
          created_at?:        string
          updated_at?:        string
        }
        Update: Partial<Omit<Payment, 'id' | 'order_id' | 'client_id' | 'method' | 'amount'>>
      }
      inventory_movements: {
        Row: InventoryMovement
        Insert: {
          id?:             string
          product_id:      string
          movement_type:   MovementType
          quantity:        number
          stock_before:    number
          stock_after:     number
          reference_id?:   string | null
          reference_type?: string | null
          notes?:          string | null
          created_by?:     string | null
          created_at?:     string
        }
        Update: never   // inventory movements are immutable
      }
      production_records: {
        Row: ProductionRecord
        Insert: {
          id?:          string
          product_id:   string
          quantity:     number
          batch_notes?: string | null
          produced_at?: string
          created_by:   string
          created_at?:  string
        }
        Update: Partial<Omit<ProductionRecord, 'id' | 'created_at'>>
      }
    }
    Views:  Record<string, never>
    Enums: {
      user_role:      UserRole
      order_status:   OrderStatus
      payment_method: PaymentMethod
      payment_status: PaymentStatus
      movement_type:  MovementType
    }
    Functions: {
      get_my_role: { Args: Record<string, never>; Returns: UserRole }
    }
  }
}
