// =============================================================
// DATA MODELS
// =============================================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  product_count?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  old_price?: number;
  stock: number;
  image?: string;
  images?: string[];
  category_id?: number;
  category_name?: string;
  category_slug?: string;
  brand?: string;
  rating: number;
  reviews_count: number;
  featured: number;
  active: number;
  in_wishlist?: boolean;
  in_cart_quantity?: number;
  discount_percent?: number;
  created_at?: string;
}

export interface CartItem {
  cart_id: number;
  id: number;
  name: string;
  slug: string;
  price: number;
  old_price?: number;
  image?: string;
  stock: number;
  brand?: string;
  quantity: number;
  created_at?: string;
}

export interface CartSummary {
  subtotal: number;
  savings: number;
  totalQuantity: number;
  itemCount: number;
}

export interface WishlistItem {
  wishlist_id: number;
  id: number;
  name: string;
  slug: string;
  price: number;
  old_price?: number;
  image?: string;
  stock: number;
  brand?: string;
  rating: number;
  created_at?: string;
}

export interface OrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  product_image?: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: number;
  user_id: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method?: string;
  shipping_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_zip?: string;
  shipping_country?: string;
  shipping_phone?: string;
  notes?: string;
  item_count?: number;
  items?: OrderItem[];
  user_name?: string;
  user_email?: string;
  created_at?: string;
}

export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  comment?: string;
  user_name?: string;
  display_name?: string;
  user_avatar?: string;
  verified?: number;
  created_at?: string;
}

export interface Coupon {
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
}

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  lowStockProducts: number;
  recentOrders: Order[];
  topProducts: any[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  products?: T[];
  items?: T[];
  orders?: T[];
  users?: T[];
  categories?: T[];
  pagination?: Pagination;
}
