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

const SHOPEE_API_BASE = "https://partner.shopeemobile.com";
const SHOPEE_API_V2 = `${SHOPEE_API_BASE}/api/v2`;

export class ShopeeAdapter extends PlatformAdapter {
  private partnerId: number;
  private shopId: number | null = null;

  constructor(credentials: PlatformCredentials, partnerId?: number) {
    super(credentials);
    this.partnerId = partnerId || parseInt(credentials.appKey);
  }

  get platformName() { return "Shopee Malaysia"; }
  get baseUrl() { return SHOPEE_API_V2; }

  setShopId(id: string | number) {
    this.shopId = typeof id === "string" ? parseInt(id) : id;
  }

  private generateSign(path: string, timestamp: number, accessToken = "", shopId = 0): string {
    const baseStr = `${this.partnerId}${path}${timestamp}${accessToken}${shopId}`;
    return crypto.createHmac("sha256", this.credentials.appSecret).update(baseStr).digest("hex");
  }

  getAuthUrl(state: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/shop/auth_partner";
    const sign = this.generateSign(path, timestamp);
    const redirectUrl = this.credentials.redirectUrl || "";
    return `${SHOPEE_API_BASE}${path}?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
  }

  async authorize(code: string): Promise<AuthToken> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/auth/token/get";
    const sign = this.generateSign(path, timestamp);

    const response = await fetch(`${SHOPEE_API_V2}/auth/token/get?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        partner_id: this.partnerId,
        shop_id: this.shopId,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`Shopee auth error: ${data.message}`);

    this.shopId = data.shop_id;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expire_in * 1000),
      shopId: String(data.shop_id),
    };
  }

  async refreshToken(token: AuthToken): Promise<AuthToken> {
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/auth/access_token/get";
    const sign = this.generateSign(path, timestamp);

    const response = await fetch(`${SHOPEE_API_V2}/auth/access_token/get?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: token.refreshToken,
        partner_id: this.partnerId,
        shop_id: this.shopId,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`Shopee refresh error: ${data.message}`);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expire_in * 1000),
    };
  }

  async getProducts(params: QueryParams): Promise<{ items: PlatformProduct[]; total: number }> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/product/get_item_list";
    const sign = this.generateSign(path, timestamp, accessToken, this.shopId!);

    const offset = ((params.page || 1) - 1) * (params.pageSize || 20);
    const url = `${SHOPEE_API_V2}/product/get_item_list?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${this.shopId}&offset=${offset}&page_size=${params.pageSize || 20}&item_status=${params.status || "NORMAL"}`;

    const response = await fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(`Shopee products error: ${data.message}`);

    const items: PlatformProduct[] = (data.response?.item || []).map((item: any) => ({
      platformItemId: String(item.item_id),
      name: item.item_name || "",
      description: item.description || "",
      price: item.price_info?.[0]?.current_price || 0,
      stock: item.stock_info_v2?.summary_info?.total_available_stock || 0,
      images: (item.image?.image_url_list || []),
      status: item.item_status,
      url: `https://shopee.com.my/product/${this.shopId}/${item.item_id}`,
      category: "",
      variants: [],
    }));

    return { items, total: data.response?.total_count || 0 };
  }

  async getProduct(itemId: string): Promise<PlatformProduct> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/product/get_item_base_info";
    const sign = this.generateSign(path, timestamp, accessToken, this.shopId!);

    const url = `${SHOPEE_API_V2}/product/get_item_base_info?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${this.shopId}&item_id_list=${itemId}`;

    const response = await fetch(url);
    const data = await response.json();
    const item = data.response?.item_list?.[0];
    if (!item) throw new Error("Product not found");

    return {
      platformItemId: String(item.item_id),
      name: item.item_name,
      description: item.description,
      price: item.price_info?.[0]?.current_price || 0,
      stock: item.stock_info_v2?.summary_info?.total_available_stock || 0,
      images: item.image?.image_url_list || [],
      status: item.item_status,
      url: `https://shopee.com.my/product/${this.shopId}/${item.item_id}`,
      category: String(item.category_id || ""),
      variants: (item.model || []).map((m: any) => ({
        id: String(m.model_id),
        name: m.model_name,
        sku: m.model_sku,
        price: m.price_info?.[0]?.current_price || 0,
        stock: m.stock_info_v2?.summary_info?.total_available_stock || 0,
      })),
    };
  }

  async updateStock(itemId: string, _variantId: string, stock: number): Promise<void> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/product/update_stock";
    const sign = this.generateSign(path, timestamp, accessToken, this.shopId!);

    await fetch(`${SHOPEE_API_V2}/product/update_stock?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${this.shopId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_id: parseInt(itemId),
        stock_list: [{ model_id: 0, normal_stock: stock }],
      }),
    });
  }

  async getOrders(params: QueryParams): Promise<{ items: PlatformOrder[]; total: number }> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/order/get_order_list";
    const sign = this.generateSign(path, timestamp, accessToken, this.shopId!);

    const timeFrom = Math.floor((params.startDate || new Date(Date.now() - 7 * 86400000)).getTime() / 1000);
    const timeTo = Math.floor((params.endDate || new Date()).getTime() / 1000);

    const url = `${SHOPEE_API_V2}/order/get_order_list?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${this.shopId}&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=${params.pageSize || 20}&order_status=${params.status || "ALL"}`;

    const response = await fetch(url);
    const data = await response.json();

    const items: PlatformOrder[] = (data.response?.order_list || []).map((o: any) => ({
      platformOrderId: o.order_sn,
      status: o.order_status,
      buyerName: o.buyer_username || "",
      buyerPhone: "",
      shippingAddress: { name: "", phone: "", address: "", city: "", state: "", postcode: "", country: "MY" },
      items: [],
      subtotal: 0,
      shippingFee: 0,
      discount: 0,
      totalAmount: o.total_amount || 0,
      currency: "MYR",
      platformFee: 0,
      commissionFee: 0,
      createdAt: new Date(o.create_time * 1000),
      paidAt: o.pay_time ? new Date(o.pay_time * 1000) : null,
    }));

    return { items, total: data.response?.more ? 999 : items.length };
  }

  async getOrder(orderId: string): Promise<PlatformOrder> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/order/get_order_detail";
    const sign = this.generateSign(path, timestamp, accessToken, this.shopId!);

    const url = `${SHOPEE_API_V2}/order/get_order_detail?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${this.shopId}&order_sn_list=${orderId}`;

    const response = await fetch(url);
    const data = await response.json();
    const o = data.response?.order_list?.[0];
    if (!o) throw new Error("Order not found");

    return {
      platformOrderId: o.order_sn,
      status: o.order_status,
      buyerName: o.buyer_username,
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
        platformItemId: String(item.item_id),
        name: item.item_name,
        sku: item.item_sku,
        quantity: item.model_quantity_purchased,
        unitPrice: item.model_discounted_price || item.model_original_price,
      })),
      subtotal: o.total_amount,
      shippingFee: o.estimated_shipping_fee || 0,
      discount: o.voucher_absorbed || 0,
      totalAmount: o.total_amount,
      currency: o.currency || "MYR",
      platformFee: o.service_fee || 0,
      commissionFee: o.commission_fee || 0,
      createdAt: new Date(o.create_time * 1000),
      paidAt: o.pay_time ? new Date(o.pay_time * 1000) : null,
    };
  }

  async shipOrder(orderId: string, tracking: TrackingInfo): Promise<void> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/logistics/ship_order";
    const sign = this.generateSign(path, timestamp, accessToken, this.shopId!);

    await fetch(`${SHOPEE_API_V2}/logistics/ship_order?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${this.shopId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_sn: orderId,
        pickup: { tracking_number: tracking.trackingNumber },
      }),
    });
  }

  async getShippingProviders(): Promise<ShippingProvider[]> {
    const accessToken = await this.ensureToken();
    const timestamp = Math.floor(Date.now() / 1000);
    const path = "/api/v2/logistics/get_channel_list";
    const sign = this.generateSign(path, timestamp, accessToken, this.shopId!);

    const url = `${SHOPEE_API_V2}/logistics/get_channel_list?partner_id=${this.partnerId}&timestamp=${timestamp}&sign=${sign}&access_token=${accessToken}&shop_id=${this.shopId}`;

    const response = await fetch(url);
    const data = await response.json();

    return (data.response?.logistics_channel_list || []).map((ch: any) => ({
      id: String(ch.logistics_channel_id),
      name: ch.logistics_channel_name,
      enabled: ch.enabled,
    }));
  }

  async getTrackingInfo(trackingNumber: string): Promise<TrackingStatus> {
    return {
      status: "in_transit",
      updates: [{ timestamp: new Date(), description: `Tracking ${trackingNumber}: In transit` }],
    };
  }
}
