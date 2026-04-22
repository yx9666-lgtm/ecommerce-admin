export interface PlatformCredentials {
  appKey: string;
  appSecret: string;
  redirectUrl?: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  shopId?: string;
}

export interface PlatformProduct {
  platformItemId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  status: string;
  url: string;
  category: string;
  variants: PlatformVariant[];
}

export interface PlatformVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export interface PlatformOrder {
  platformOrderId: string;
  status: string;
  buyerName: string;
  buyerPhone: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  items: PlatformOrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  currency: string;
  platformFee: number;
  commissionFee: number;
  createdAt: Date;
  paidAt: Date | null;
}

export interface PlatformOrderItem {
  platformItemId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
}

export interface ShippingProvider {
  id: string;
  name: string;
  enabled: boolean;
}

export interface TrackingStatus {
  status: string;
  updates: { timestamp: Date; description: string; location?: string }[];
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  keyword?: string;
}

export abstract class PlatformAdapter {
  protected credentials: PlatformCredentials;
  protected token: AuthToken | null = null;

  constructor(credentials: PlatformCredentials) {
    this.credentials = credentials;
  }

  abstract get platformName(): string;
  abstract get baseUrl(): string;

  abstract authorize(code: string): Promise<AuthToken>;
  abstract refreshToken(token: AuthToken): Promise<AuthToken>;
  abstract getAuthUrl(state: string): string;

  abstract getProducts(params: QueryParams): Promise<{ items: PlatformProduct[]; total: number }>;
  abstract getProduct(itemId: string): Promise<PlatformProduct>;
  abstract updateStock(itemId: string, variantId: string, stock: number): Promise<void>;

  abstract getOrders(params: QueryParams): Promise<{ items: PlatformOrder[]; total: number }>;
  abstract getOrder(orderId: string): Promise<PlatformOrder>;
  abstract shipOrder(orderId: string, tracking: TrackingInfo): Promise<void>;

  abstract getShippingProviders(): Promise<ShippingProvider[]>;
  abstract getTrackingInfo(trackingNumber: string): Promise<TrackingStatus>;

  setToken(token: AuthToken) {
    this.token = token;
  }

  isTokenExpired(): boolean {
    if (!this.token) return true;
    return new Date() >= this.token.expiresAt;
  }

  protected async ensureToken(): Promise<string> {
    if (!this.token) throw new Error("Not authenticated");
    if (this.isTokenExpired()) {
      this.token = await this.refreshToken(this.token);
    }
    return this.token.accessToken;
  }
}
