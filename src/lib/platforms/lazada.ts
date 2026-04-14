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

const LAZADA_API_BASE = "https://api.lazada.com.my/rest";
const LAZADA_AUTH_URL = "https://auth.lazada.com/oauth/authorize";

export class LazadaAdapter extends PlatformAdapter {
  get platformName() { return "Lazada Malaysia"; }
  get baseUrl() { return LAZADA_API_BASE; }

  private generateSign(params: Record<string, string>, apiPath: string): string {
    const sorted = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join("");
    const signStr = `${apiPath}${sorted}`;
    return crypto.createHmac("sha256", this.credentials.appSecret).update(signStr).digest("hex").toUpperCase();
  }

  private async apiRequest(path: string, method: string = "GET", body?: any): Promise<any> {
    const accessToken = await this.ensureToken();
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      app_key: this.credentials.appKey,
      timestamp,
      access_token: accessToken,
      sign_method: "sha256",
    };
    params.sign = this.generateSign(params, path);

    const queryString = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const url = `${LAZADA_API_BASE}${path}?${queryString}`;

    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json();
  }

  getAuthUrl(state: string): string {
    return `${LAZADA_AUTH_URL}?response_type=code&force_auth=true&redirect_uri=${encodeURIComponent(this.credentials.redirectUrl || "")}&client_id=${this.credentials.appKey}&state=${state}`;
  }

  async authorize(code: string): Promise<AuthToken> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      app_key: this.credentials.appKey,
      timestamp,
      code,
      sign_method: "sha256",
    };
    params.sign = this.generateSign(params, "/auth/token/create");

    const queryString = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const response = await fetch(`${LAZADA_API_BASE}/auth/token/create?${queryString}`, { method: "POST" });
    const data = await response.json();

    if (data.code !== "0") throw new Error(`Lazada auth error: ${data.message}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(token: AuthToken): Promise<AuthToken> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      app_key: this.credentials.appKey,
      timestamp,
      refresh_token: token.refreshToken,
      sign_method: "sha256",
    };
    params.sign = this.generateSign(params, "/auth/token/refresh");

    const queryString = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    const response = await fetch(`${LAZADA_API_BASE}/auth/token/refresh?${queryString}`, { method: "POST" });
    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getProducts(params: QueryParams): Promise<{ items: PlatformProduct[]; total: number }> {
    const data = await this.apiRequest("/products/get", "GET");
    const products = data.data?.products || [];

    return {
      items: products.map((p: any) => ({
        platformItemId: String(p.item_id),
        name: p.attributes?.name || "",
        description: p.attributes?.description || "",
        price: parseFloat(p.skus?.[0]?.price || "0"),
        stock: p.skus?.reduce((s: number, sku: any) => s + (parseInt(sku.quantity) || 0), 0) || 0,
        images: (p.images || []),
        status: p.status,
        url: p.skus?.[0]?.Url || "",
        category: String(p.primary_category || ""),
        variants: (p.skus || []).map((sku: any) => ({
          id: sku.SkuId,
          name: sku.color_family || sku.size || "",
          sku: sku.SellerSku || "",
          price: parseFloat(sku.price || "0"),
          stock: parseInt(sku.quantity || "0"),
        })),
      })),
      total: data.data?.total_products || 0,
    };
  }

  async getProduct(itemId: string): Promise<PlatformProduct> {
    const result = await this.getProducts({ keyword: itemId });
    const product = result.items.find((p) => p.platformItemId === itemId);
    if (!product) throw new Error("Product not found");
    return product;
  }

  async updateStock(itemId: string, _variantId: string, stock: number): Promise<void> {
    await this.apiRequest("/product/stock/sellable/update", "POST", {
      item_id: itemId,
      skus: [{ quantity: stock }],
    });
  }

  async getOrders(params: QueryParams): Promise<{ items: PlatformOrder[]; total: number }> {
    const data = await this.apiRequest("/orders/get", "GET");
    const orders = data.data?.orders || [];

    return {
      items: orders.map((o: any) => ({
        platformOrderId: String(o.order_id),
        status: o.statuses?.[0] || "unknown",
        buyerName: o.customer_first_name || "",
        buyerPhone: "",
        shippingAddress: {
          name: o.address_shipping?.first_name || "",
          phone: o.address_shipping?.phone || "",
          address: o.address_shipping?.address1 || "",
          city: o.address_shipping?.city || "",
          state: o.address_shipping?.region || "",
          postcode: o.address_shipping?.post_code || "",
          country: "MY",
        },
        items: [],
        subtotal: parseFloat(o.price || "0"),
        shippingFee: parseFloat(o.shipping_fee || "0"),
        discount: parseFloat(o.voucher || "0"),
        totalAmount: parseFloat(o.price || "0"),
        currency: "MYR",
        platformFee: 0,
        commissionFee: 0,
        createdAt: new Date(o.created_at),
        paidAt: o.payment_method ? new Date(o.created_at) : null,
      })),
      total: data.data?.count || 0,
    };
  }

  async getOrder(orderId: string): Promise<PlatformOrder> {
    const data = await this.apiRequest(`/order/get?order_id=${orderId}`, "GET");
    const o = data.data;
    if (!o) throw new Error("Order not found");

    return {
      platformOrderId: String(o.order_id),
      status: o.statuses?.[0] || "",
      buyerName: o.customer_first_name || "",
      buyerPhone: o.address_shipping?.phone || "",
      shippingAddress: {
        name: `${o.address_shipping?.first_name || ""} ${o.address_shipping?.last_name || ""}`.trim(),
        phone: o.address_shipping?.phone || "",
        address: `${o.address_shipping?.address1 || ""} ${o.address_shipping?.address2 || ""}`.trim(),
        city: o.address_shipping?.city || "",
        state: o.address_shipping?.region || "",
        postcode: o.address_shipping?.post_code || "",
        country: "MY",
      },
      items: (o.order_items || []).map((item: any) => ({
        platformItemId: String(item.product_id),
        name: item.name,
        sku: item.sku,
        quantity: parseInt(item.quantity || "1"),
        unitPrice: parseFloat(item.item_price || "0"),
      })),
      subtotal: parseFloat(o.price || "0"),
      shippingFee: parseFloat(o.shipping_fee || "0"),
      discount: parseFloat(o.voucher || "0"),
      totalAmount: parseFloat(o.price || "0"),
      currency: "MYR",
      platformFee: 0,
      commissionFee: 0,
      createdAt: new Date(o.created_at),
      paidAt: o.payment_method ? new Date(o.created_at) : null,
    };
  }

  async shipOrder(orderId: string, tracking: TrackingInfo): Promise<void> {
    await this.apiRequest("/order/pack", "POST", {
      shipping_provider: tracking.carrier,
      order_item_ids: [orderId],
    });
  }

  async getShippingProviders(): Promise<ShippingProvider[]> {
    const data = await this.apiRequest("/shipment/providers/get", "GET");
    return (data.data?.shipment_providers || []).map((sp: any) => ({
      id: sp.name,
      name: sp.name,
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
