/**
 * Tipos compartidos del dominio de ecommerce.
 *
 * Este archivo contiene:
 * - Enums compartidos entre frontend y backend
 * - Interfaces de modelo (sin campos sensibles)
 * - DTOs para requests/responses de la API
 * - Tipos de respuesta genéricos
 */

// ==========================================
// Enums compartidos
// ==========================================

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum AddressLabel {
  HOME = 'HOME',
  OFFICE = 'OFFICE',
  OTHER = 'OTHER',
}

// ==========================================
// Usuario y Autenticación
// ==========================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  isEmailVerified: boolean;
  isBanned: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User con campos sensibles omitidos (respuestas de API).
 * Nunca expone passwordHash, failedLoginAttempts, etc.
 */
export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ==========================================
// MFA
// ==========================================

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  manualEntry: string;
}

export interface MFAVerifyRequest {
  mfaToken: string;
  code: string;
}

// ==========================================
// CSRF
// ==========================================

export interface CsrfTokenResponse {
  csrfToken: string;
}

// ==========================================
// Sesión
// ==========================================

export interface Session {
  id: string;
  userId: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

// ==========================================
// Producto
// ==========================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  specs: Record<string, unknown> | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string;
  brandId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDetail extends Product {
  category: Category;
  brand: Brand | null;
}

export type StockStatus = 'available' | 'low_stock' | 'out_of_stock';

export interface PublicProduct extends Omit<Product, 'lowStockThreshold' | 'stock'> {
  stockStatus: StockStatus;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  brand?: Pick<Brand, 'id' | 'name' | 'slug' | 'logo'> | null;
  reviewSummary?: {
    averageRating: number;
    totalReviews: number;
  };
}

export interface PublicProductDetail extends PublicProduct {
  reviews: Array<{
    id: string;
    rating: number;
    title: string;
    body: string;
    user: { name: string | null };
    createdAt: Date;
  }>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
}

export interface CategoryWithProducts extends Category {
  products: Product[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  isActive: boolean;
}

// ==========================================
// Carrito
// ==========================================

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  priceAtTime: number;
  product: Product;
}

export interface Cart {
  id: string;
  userId: string | null;
  sessionId: string | null;
  items: CartItem[];
  updatedAt: Date;
}

export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  images: string[];
  brand: Pick<Brand, 'name'> | null;
}

// ==========================================
// Dirección
// ==========================================

export interface Address {
  id: string;
  userId: string;
  label: AddressLabel;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
}

// ==========================================
// Orden y Pago
// ==========================================

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  addressId: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  address: Address;
  statusHistory: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes: string | null;
  createdAt: Date;
}

// ==========================================
// Review
// ==========================================

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: Date;
  user?: SafeUser;
}

// ==========================================
// Admin Audit Log
// ==========================================

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

// ==========================================
// DTOs - Productos
// ==========================================

export interface CreateProductDTO {
  sku: string;
  name: string;
  slug: string;
  description: string;
  specs?: Record<string, unknown>;
  price: number;
  comparePrice?: number;
  cost: number;
  stock: number;
  lowStockThreshold?: number;
  images: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  categoryId: string;
  brandId?: string;
}

export interface UpdateProductDTO {
  sku?: string;
  name?: string;
  slug?: string;
  description?: string;
  specs?: Record<string, unknown>;
  price?: number;
  comparePrice?: number;
  cost?: number;
  stock?: number;
  lowStockThreshold?: number;
  images?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  categoryId?: string;
  brandId?: string;
}

// ==========================================
// DTOs - Órdenes
// ==========================================

export interface CreateOrderDTO {
  addressId: string;
  items: { productId: string; quantity: number }[];
  notes?: string;
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
  notes?: string;
}

export interface CreateOrderItemDTO {
  productId: string;
  quantity: number;
}

// ==========================================
// DTOs - Usuarios
// ==========================================

export interface CreateUserDTO {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}

export interface UpdateUserDTO {
  name?: string;
  phone?: string;
}

// ==========================================
// DTOs - Reviews
// ==========================================

export interface CreateReviewDTO {
  productId: string;
  rating: number;
  title: string;
  body: string;
}

export interface UpdateReviewDTO {
  rating?: number;
  title?: string;
  body?: string;
}

// ==========================================
// DTOs - Carrito
// ==========================================

export interface AddToCartDTO {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDTO {
  quantity: number;
}

// ==========================================
// DTOs - Direcciones
// ==========================================

export interface CreateAddressDTO {
  label: AddressLabel;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UpdateAddressDTO {
  label?: AddressLabel;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

// ==========================================
// DTOs - Paginación y Query
// ==========================================

export interface PaginatedQueryDTO {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ==========================================
// Tipos de respuesta API
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: { path: string; message: string }[];
  };
}

// ==========================================
// DTOs - Checkout
// ==========================================

export interface CheckoutSummary {
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    name: string;
    sku: string;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  priceAlerts: Array<{
    productId: string;
    productName: string;
    oldPrice: number;
    newPrice: number;
  }>;
  stockAlerts: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

export interface CreatePaymentIntentDTO {
  addressId: string;
  shippingMethod: 'standard' | 'express';
  notes?: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  orderId: string;
  orderNumber: string;
  total: number;
}

export interface CartWithProducts {
  items: Array<{
    id: string;
    quantity: number;
    priceAtTime: number;
    product: CartProduct;
    priceChanged: boolean;
    currentPrice: number;
  }>;
  priceAlerts: CheckoutSummary['priceAlerts'];
  stockAlerts: CheckoutSummary['stockAlerts'];
  subtotal: number;
  itemCount: number;
}

// ==========================================
// DTOs - Admin Dashboard
// ==========================================

export interface DashboardMetricsDTO {
  salesToday: number;
  salesThisWeek: number;
  salesThisMonth: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    sku: string;
    stock: number;
    lowStockThreshold: number;
    price: number;
  }>;
  newUsersThisWeek: number;
  dailySalesLast30Days: Array<{ date: string; total: number }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
  }>;
}

// ==========================================
// DTOs - Admin Orders
// ==========================================

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface AdminOrderDetail extends OrderDetail {
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
  };
}

// ==========================================
// DTOs - Admin Users
// ==========================================

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isEmailVerified: boolean;
  isBanned: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  orderCount: number;
}

export interface AdminBanUserDTO {
  reason: string;
}

// ==========================================
// DTOs - Upload
// ==========================================

export interface UploadImageResponseDTO {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

// ==========================================
// DTOs - Profile
// ==========================================

export interface UpdateProfileDTO {
  name?: string;
  phone?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// ==========================================
// DTOs - Address
// ==========================================

export interface AddressDTO {
  id: string;
  userId: string;
  label: AddressLabel;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CreateAddressDTO {
  label: AddressLabel;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
}

export interface UpdateAddressDTO {
  label?: AddressLabel;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
}

// ==========================================
// DTOs - Review
// ==========================================

export interface CreateReviewDTO {
  productId: string;
  rating: number;
  title: string;
  body: string;
}

export interface ReviewResponseDTO {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: Date;
  user?: {
    id: string;
    name: string | null;
  };
}

// ==========================================
// DTOs - Session
// ==========================================

export interface UserSessionDTO {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

// ==========================================
// Utilidades de tipos
// ==========================================

/**
 * Omite el campo passwordHash de cualquier tipo.
 */
export type OmitPassword<T> = Omit<T, 'passwordHash'>;

/**
 * Hace todas las propiedades opcionales en profundidad.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Convierte Decimal de Prisma a número para la API.
 */
export type DecimalToNumber<T> = {
  [K in keyof T]: T[K] extends { toNumber: () => number } ? number : T[K];
};
