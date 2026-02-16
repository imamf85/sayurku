export type Unit = 'gram' | 'kg' | 'ons' | 'pcs' | 'ikat' | 'pack'

export type PromoType = 'percentage' | 'fixed'

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

export type AdminRole = 'super_admin' | 'admin'

export type DeliverySlotType = 'instant' | 'scheduled'

export interface OtpVerification {
  id: string
  phone: string
  otp_code: string
  expires_at: string
  verified: boolean
  attempts: number
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  user_id: string
  label: string
  address: string
  province: string
  city: string
  district: string
  village: string
  postal_code: string
  notes: string | null
  is_default: boolean
  created_at: string
}

export interface Admin {
  id: string
  email: string
  name: string
  role: AdminRole
  is_active: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  category_id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  price: number
  unit: Unit
  unit_value: number
  stock: number
  is_active: boolean
  is_preorder: boolean
  preorder_days: number | null
  created_at: string
  updated_at: string
  category?: Category
  promo?: Promo | null
}

export interface Promo {
  id: string
  product_id: string | null
  name: string
  type: PromoType
  value: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface Voucher {
  id: string
  code: string
  type: PromoType
  value: number
  min_purchase: number
  max_discount: number | null
  usage_limit: number
  used_count: number
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export interface CartItem {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  product?: Product
}

export interface Wishlist {
  id: string
  user_id: string
  product_id: string
  created_at: string
  product?: Product
}

export interface AddressSnapshot {
  label: string
  address: string
  province: string
  city: string
  district: string
  village: string
  postal_code: string
  notes: string | null
}

export interface ProductSnapshot {
  id: string
  name: string
  image_url: string | null
  price: number
  unit: Unit
  unit_value: number
}

export interface Order {
  id: string
  user_id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  discount: number
  voucher_id: string | null
  total: number
  address_snapshot: AddressSnapshot
  delivery_date: string
  delivery_slot: string
  notes: string | null
  payment_method: string | null
  payment_id: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
  voucher?: Voucher | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_snapshot: ProductSnapshot
  quantity: number
  price: number
  discount: number
  subtotal: number
}

export interface Review {
  id: string
  user_id: string
  product_id: string
  order_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface DeliverySlot {
  id: string
  name: string
  slot_type: DeliverySlotType
  time_start: string | null
  time_end: string | null
  is_active: boolean
  sort_order: number
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      addresses: {
        Row: Address
        Insert: Omit<Address, 'id' | 'created_at'>
        Update: Partial<Omit<Address, 'id' | 'user_id' | 'created_at'>>
      }
      admins: {
        Row: Admin
        Insert: Omit<Admin, 'id' | 'created_at'>
        Update: Partial<Omit<Admin, 'id' | 'created_at'>>
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id' | 'created_at'>
        Update: Partial<Omit<Category, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      promos: {
        Row: Promo
        Insert: Omit<Promo, 'id' | 'created_at'>
        Update: Partial<Omit<Promo, 'id' | 'created_at'>>
      }
      vouchers: {
        Row: Voucher
        Insert: Omit<Voucher, 'id' | 'created_at'>
        Update: Partial<Omit<Voucher, 'id' | 'created_at'>>
      }
      cart_items: {
        Row: CartItem
        Insert: Omit<CartItem, 'id' | 'created_at'>
        Update: Partial<Omit<CartItem, 'id' | 'user_id' | 'created_at'>>
      }
      wishlists: {
        Row: Wishlist
        Insert: Omit<Wishlist, 'id' | 'created_at'>
        Update: never
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Order, 'id' | 'user_id' | 'created_at'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id'>
        Update: never
      }
      reviews: {
        Row: Review
        Insert: Omit<Review, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Review, 'id' | 'user_id' | 'product_id' | 'order_id' | 'created_at'>>
      }
      delivery_slots: {
        Row: DeliverySlot
        Insert: Omit<DeliverySlot, 'id'>
        Update: Partial<Omit<DeliverySlot, 'id'>>
      }
    }
  }
}
