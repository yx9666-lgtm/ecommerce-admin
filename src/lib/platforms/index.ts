import { PlatformAdapter, PlatformCredentials } from "./base";
import { ShopeeAdapter } from "./shopee";
import { LazadaAdapter } from "./lazada";
import { TikTokAdapter } from "./tiktok";
import { PGMallAdapter } from "./pgmall";

export type PlatformType = "SHOPEE" | "LAZADA" | "TIKTOK" | "PGMALL";

export function createPlatformAdapter(
  platform: PlatformType,
  credentials: PlatformCredentials
): PlatformAdapter {
  switch (platform) {
    case "SHOPEE":
      return new ShopeeAdapter(credentials);
    case "LAZADA":
      return new LazadaAdapter(credentials);
    case "TIKTOK":
      return new TikTokAdapter(credentials);
    case "PGMALL":
      return new PGMallAdapter(credentials);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

export { PlatformAdapter } from "./base";
export type {
  PlatformCredentials,
  AuthToken,
  PlatformProduct,
  PlatformOrder,
  QueryParams,
  TrackingInfo,
  ShippingProvider,
  TrackingStatus,
} from "./base";
