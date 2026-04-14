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

const TIKTOK_API_BASE = "https://open-api.tiktokglobalshop.com";
const TIKTOK_AUTH_URL = "https://auth.tiktok-shops.com/oauth/authorize";

export class TikTokAdapter extends PlatformAdapter {
  get platformName() { return "TikTok Shop Malaysia"; }
  get baseUrl() { return TIKTOK_API_BASE; }

  private generateSign(path: string, params: Record<string, string>, body?: string): string {
    const sortedParams = Object.keys(params)
      .filter((k) => k !== "sign" && k !== "access_token")
      .sort()
      .map((k) => `${k}${params[k]}`)
      .join("");
    const signStr = `${this.credentials.appSecret}${path}${sortedParams}${body || ""}${this.credentials.appSecret}`;
    return crypto.createHmac("sha256", this.credentials.appSecret).update(signStr).digest("hex");
  }

  getAuthUrl(state: string): string {
    const redirectUri = this.credentials.redirectUrl || "";
    return `${TIKTOK_AUTH_URL}?app_key=${this.credentials.appKey}&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async authorize(code: string): Promise<AuthToken> {
    const params = {
      app_key: this.credentials.appKey,
      app_secret: this.credentials.appSecret,
      auth_code: code,
      grant_type: "authorized_code",
    };

    const response = await fetch(`${TIKTOK_API_BASE}/api/v2/token/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (data.code !== 0) throw new Error(`TikTok auth error: ${data.message}`);

    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: new Date(Date.now() + data.data.access_token_expire_in * 1000),
    };
  }

  async refreshToken(token: AuthToken): Promise<AuthToken> {
    const response = await fetch(`${TIKTOK_API_BASE}/api/v2/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: this.credentials.appKey,
        app_secret: this.credentials.appSecret,
        refresh_token: token.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    return {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
      expiresAt: new Date(Date.now() + data.data.access_token_expire_in * 1000),
    };
  }

  private async apiRequest(path: string, method = "GET", body?: any): Promise<any> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params: Record<string, string> = {
      app_key: this.credentials.appKey,
      timestamp,
    };
    const bodyStr = body ? JSON.stringify(body) : undefined;
    params.sign = this.generateSign(path, params, bodyStr);

    const queryString = Object.entries({ ...params, access_token: accessToken })
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");

    const response = await fetch(`${TIKTOK_API_BASE}${path}?${queryString}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: bodyStr,
    });

    return response.json();
  }

  async getProducts(params: QueryParams): Promise<{ items: PlatformProduct[]; total: number }> {
    const data = await this.apiRequest("/api/products/search", "POST", {
      page_number: params.page || 1,
      page_size: params.pageSize || 20,
    });

    const products = data.data?.products || [];
    return {
      items: products.map((p: any) => ({
        platformItemId: p.id,
        name: p.title || "",
        description: p.description || "",
        price: p.skus?.[0]?.price?.sale_price ? parseFloat(p.skus[0].price.sale_price) / 100 : 0,
        stock: p.skus?.reduce((s: number, sku: any) => s + (sku.inventory?.[0]?.quantity || 0), 0) || 0,
        images: (p.images || []).map((img: any) => img.url_list?.[0] || ""),
        status: p.status,
        url: "",
        category: p.category_list?.map((c: any) => c.id).join("/") || "",
        variants: (p.skus || []).map((sku: any) => ({
          id: sku.id,
          name: sku.sales_attributes?.map((a: any) => a.value_name).join(" / ") || "",
          sku: sku.seller_sku || "",
          price: sku.price?.sale_price ? parseFloat(sku.price.sale_price) / 100 : 0,
          stock: sku.inventory?.[0]?.quantity || 0,
        })),
      })),
      total: data.data?.total || 0,
    };
  }

  async getProduct(itemId: string): Promise<PlatformProduct> {
    const data = await this.apiRequest(`/api/products/details?product_id=${itemId}`);
    const p = data.data;
    if (!p) throw new Error("Product not found");

    return {
      platformItemId: p.id,
      name: p.title || "",
      description: p.description || "",
      price: 0,
      stock: 0,
      images: [],
      status: p.status,
      url: "",
      category: "",
      variants: [],
    };
  }

  async updateStock(itemId: string, _variantId: string, stock: number): Promise<void> {
    await this.apiRequest("/api/products/stocks", "PUT", {
      product_id: itemId,
      skus: [{ id: _variantId, inventory: [{ quantity: stock }] }],
    });
  }

  async getOrders(params: QueryParams): Promise<{ items: PlatformOrder[]; total: number }> {
    const data = await this.apiRequest("/api/orders/search", "POST", {
      page_size: params.pageSize || 20,
      page: params.page || 1,
    });

    return {
      items: (data.data?.order_list || []).map((o: any) => ({
        platformOrderId: o.order_id,
        status: o.order_status?.toString() || "",
        buyerName: o.buyer_message || "",
        buyerPhone: "",
        shippingAddress: { name: "", phone: "", address: "", city: "", state: "", postcode: "", country: "MY" },
        items: [],
        subtotal: parseFloat(o.payment?.total_amount || "0") / 100,
        shippingFee: parseFloat(o.payment?.shipping_fee || "0") / 100,
        discount: parseFloat(o.payment?.seller_discount || "0") / 100,
        totalAmount: parseFloat(o.payment?.total_amount || "0") / 100,
        currency: "MYR",
        platformFee: parseFloat(o.payment?.platform_discount || "0") / 100,
        commissionFee: 0,
        createdAt: new Date(parseInt(o.create_time || "0") * 1000),
        paidAt: o.paid_time ? new Date(parseInt(o.paid_time) * 1000) : null,
      })),
      total: data.data?.total || 0,
    };
  }

  async getOrder(orderId: string): Promise<PlatformOrder> {
    const data = await this.apiRequest("/api/orders/detail/query", "POST", {
      order_id_list: [orderId],
    });
    const o = data.data?.order_list?.[0];
    if (!o) throw new Error("Order not found");

    return {
      platformOrderId: o.order_id,
      status: o.order_status?.toString() || "",
      buyerName: "",
      buyerPhone: o.recipient_address?.phone || "",
      shippingAddress: {
        name: o.recipient_address?.name || "",
        phone: o.recipient_address?.phone || "",
        address: o.recipient_address?.full_address || "",
        city: o.recipient_address?.city || "",
        state: o.recipient_address?.state || "",
        postcode: o.recipient_address?.zipcode || "",
        country: "MY",
      },
      items: (o.item_list || []).map((item: any) => ({
        platformItemId: item.product_id,
        name: item.product_name,
        sku: item.seller_sku,
        quantity: item.quantity,
        unitPrice: parseFloat(item.sku_sale_price || "0") / 100,
      })),
      subtotal: parseFloat(o.payment?.total_amount || "0") / 100,
      shippingFee: parseFloat(o.payment?.shipping_fee || "0") / 100,
      discount: 0,
      totalAmount: parseFloat(o.payment?.total_amount || "0") / 100,
      currency: "MYR",
      platformFee: 0,
      commissionFee: 0,
      createdAt: new Date(parseInt(o.create_time) * 1000),
      paidAt: null,
    };
  }

  async shipOrder(orderId: string, tracking: TrackingInfo): Promise<void> {
    await this.apiRequest("/api/fulfillment/ship_package", "POST", {
      order_id: orderId,
      tracking_number: tracking.trackingNumber,
      shipping_provider_id: tracking.carrier,
    });
  }

  async getShippingProviders(): Promise<ShippingProvider[]> {
    const data = await this.apiRequest("/api/logistics/get_shipping_providers");
    return (data.data?.shipping_provider_list || []).map((sp: any) => ({
      id: sp.shipping_provider_id,
      name: sp.shipping_provider_name,
      enabled: true,
    }));
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingStatus> {
    return {
      status: "in_transit",
      updates: [{ timestamp: new Date(), description: `Tracking ${trackingNumber}: In transit` }],
    };
  }
}
