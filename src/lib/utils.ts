import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${mo}/${day} ${h}:${mi}`;
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-MY").format(num);
}

export function formatPercent(num: number) {
  return `${(num * 100).toFixed(1)}%`;
}

export function getPlatformColor(platform: string) {
  const colors: Record<string, string> = {
    SHOPEE: "#EE4D2D",
    LAZADA: "#0F146D",
    TIKTOK: "#000000",
    PGMALL: "#E31837",
  };
  return colors[platform] || "#6B7280";
}

export function getPlatformName(platform: string) {
  const names: Record<string, string> = {
    SHOPEE: "Shopee",
    LAZADA: "Lazada",
    TIKTOK: "TikTok Shop",
    PGMALL: "PG Mall",
  };
  return names[platform] || platform;
}
