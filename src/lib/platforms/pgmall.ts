import crypto from "crypto";
import {
  PlatformAdapter,
  PlatformCredentials,
  AuthToken,
  PlatformProduct,
  PlatformOrder,
  QueryParams,
  TrackingInfo,
  ShippingProvider,
  TrackingStatus,
} from "./base";

const PGMALL_API_BASE = "https://api.pgmall.my/v1";

export class PGMallAdapter extends PlatformAdapter {
  get platformName() { return "PG Mall"; }
  get baseUrl() { return PGMALL_API_BASE; }

  private generateSign(params: Record<string, string>): string {
    const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
    return crypto.createHmac("sha256", this.credentials.appSecret).update(sorted).digest("hex");
  }

  private async apiRequest(path: string, method = "GET", body?: any): Promise<any> {
    const accessToken = await this.ensureToken();
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      app_key: this.credentials.appKey,
      timestamp,
      access_token: accessToken,
    };
    params.sign = this.generateSign(params);

    const queryString = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const url = `${PGMALL_API_BASE}${path}?${queryString}`;

    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  }

  getAuthUrl(state: string): string {
    return `https://seller.pgmall.my/oauth/authorize?app_key=${this.credentials.appKey}&redirect_uri=${encodeURIComponent(this.credentials.redirectUrl || "")}&state=${state}`;
  }

  async authorize(code: string): Promise<AuthToken> {
    const response = await fetch(`${PGMALL_API_BASE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: this.credentials.appKey,
        app_secret: this.credentials.appSecret,
        code,
      }),
    });

    const data = await response.json();
    if (!data.access_token) throw new Error(`PG Mall auth error: ${data.message || "Unknown"}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 86400) * 1000),
    };
  }

  async refreshToken(token: AuthToken): Promise<AuthToken> {
    const response = await fetch(`${PGMALL_API_BASE}/auth/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: this.credentials.appKey,
        app_secret: this.credentials.appSecret,
        refresh_token: token.refreshToken,
      }),
    });

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in || 86400) * 1000),
    };
  }

  async getProducts(params: QueryParams): Promise<{ items: PlatformProduct[]; total: number }> {
    const data = await this.apiRequest("/products", "GET");
    const products = data.data?.items || [];

    return {
      items: products.map((p: any) => ({
        platformItemId: String(p.id),
        name: p.name || "",
        description: p.description || "",
        price: p.price || 0,
        stock: p.stock || 0,
        images: p.images || [],
        status: p.status || "active",
        url: p.url || "",
        category: p.category || "",
        variants: (p.variants || []).map((v: any) => ({
          id: String(v.id),
          name: v.name || "",
          sku: v.sku || "",
          price: v.price || 0,
          stock: v.stock || 0,
        })),
      })),
      total: data.data?.total || 0,
    };
  }

  async getProduct(itemId: string): Promise<PlatformProduct> {
    const data = await this.apiRequest(`/products/${itemId}`);
    const p = data.data;
    if (!p) throw new Error("Product not found");

    return {
      platformItemId: String(p.id),
      name: p.name || "",
      description: p.description || "",
      price: p.price || 0,
      stock: p.stock || 0,
      images: p.images || [],
      status: p.status || "active",
      url: p.url || "",
      category: p.category || "",
      variants: [],
    };
  }

  async updateStock(itemId: string, _variantId: string, stock: number): Promise<void> {
    await this.apiRequest(`/products/${itemId}/stock`, "PUT", { stock });
  }

  async getOrders(params: QueryParams): Promise<{ items: PlatformOrder[]; total: number }> {
    const data = await this.apiRequest("/orders", "GET");
    const orders = data.data?.items || [];

    return {
      items: orders.map((o: any) => ({
        platformOrderId: String(o.order_id),
        status: o.status || "",
        buyerName: o.buyer_name || "",
        buyerPhone: o.buyer_phone || "",
        shippingAddress: {
          name: o.shipping?.name || "",
          phone: o.shipping?.phone || "",
          address: o.shipping?.address || "",
          city: o.shipping?.city || "",
          state: o.shipping?.state || "",
          postcode: o.shipping?.postcode || "",
          country: "MY",
        },
        items: (o.items || []).map((item: any) => ({
          platformItemId: String(item.product_id),
          name: item.name,
          sku: item.sku || "",
          quantity: item.quantity || 1,
          unitPrice: item.price || 0,
        })),
        subtotal: o.subtotal || 0,
        shippingFee: o.shipping_fee || 0,
        discount: o.discount || 0,
        totalAmount: o.total || 0,
        currency: "MYR",
        platformFee: o.platform_fee || 0,
        commissionFee: o.commission || 0,
        createdAt: new Date(o.created_at),
        paidAt: o.paid_at ? new Date(o.paid_at) : null,
      })),
      total: data.data?.total || 0,
    };
  }

  async getOrder(orderId: string): Promise<PlatformOrder> {
    const data = await this.apiRequest(`/orders/${orderId}`);
    const o = data.data;
    if (!o) throw new Error("Order not found");

    return {
      platformOrderId: String(o.order_id),
      status: o.status || "",
      buyerName: o.buyer_name || "",
      buyerPhone: o.buyer_phone || "",
      shippingAddress: {
        name: o.shipping?.name || "",
        phone: o.shipping?.phone || "",
        address: o.shipping?.address || "",
        city: o.shipping?.city || "",
        state: o.shipping?.state || "",
        postcode: o.shipping?.postcode || "",
        country: "MY",
      },
      items: (o.items || []).map((item: any) => ({
        platformItemId: String(item.product_id),
        name: item.name,
        sku: item.sku || "",
        quantity: item.quantity || 1,
        unitPrice: item.price || 0,
      })),
      subtotal: o.subtotal || 0,
      shippingFee: o.shipping_fee || 0,
      discount: o.discount || 0,
      totalAmount: o.total || 0,
      currency: "MYR",
      platformFee: o.platform_fee || 0,
      commissionFee: o.commission || 0,
      createdAt: new Date(o.created_at),
      paidAt: o.paid_at ? new Date(o.paid_at) : null,
    };
  }

  async shipOrder(orderId: string, tracking: TrackingInfo): Promise<void> {
    await this.apiRequest(`/orders/${orderId}/ship`, "POST", {
      carrier: tracking.carrier,
      tracking_number: tracking.trackingNumber,
    });
  }

  async getShippingProviders(): Promise<ShippingProvider[]> {
    return [
      { id: "jnt", name: "J&T Express", enabled: true },
      { id: "poslaju", name: "Pos Laju", enabled: true },
      { id: "dhl", name: "DHL eCommerce", enabled: true },
      { id: "ninjavan", name: "Ninja Van", enabled: true },
    ];
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingStatus> {
    return {
      status: "in_transit",
      updates: [{ timestamp: new Date(), description: `Tracking ${trackingNumber}: Processing` }],
    };
  }
}
