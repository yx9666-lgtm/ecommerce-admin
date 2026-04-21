import { NextResponse } from "next/server";

// ─── Permission Key Constants ───────────────────────────────────────────────

export const PERMISSIONS = {
  dashboard: { view: "dashboard.view" },
  products: {
    view: "products.view",
    create: "products.create",
    edit: "products.edit",
    delete: "products.delete",
  },
  orders: {
    view: "orders.view",
    create: "orders.create",
    edit: "orders.edit",
    delete: "orders.delete",
  },
  purchasing: {
    view: "purchasing.view",
    create: "purchasing.create",
    edit: "purchasing.edit",
    delete: "purchasing.delete",
  },
  suppliers: {
    view: "suppliers.view",
    create: "suppliers.create",
    edit: "suppliers.edit",
    delete: "suppliers.delete",
  },
  warehouses: {
    view: "warehouses.view",
    create: "warehouses.create",
    edit: "warehouses.edit",
    delete: "warehouses.delete",
  },
  inventory: {
    view: "inventory.view",
    create: "inventory.create",
    edit: "inventory.edit",
    delete: "inventory.delete",
  },
  finance: {
    view: "finance.view",
    create: "finance.create",
    edit: "finance.edit",
    delete: "finance.delete",
  },
  analytics: { view: "analytics.view" },
  platforms: {
    view: "platforms.view",
    create: "platforms.create",
    edit: "platforms.edit",
    delete: "platforms.delete",
  },
  settings: {
    view: "settings.view",
    create: "settings.create",
    edit: "settings.edit",
    delete: "settings.delete",
  },
} as const;

// ─── Permission Groups (for UI table rendering) ────────────────────────────

export type PermissionAction = "view" | "create" | "edit" | "delete";

export interface PermissionGroup {
  module: string;
  labelZh: string;
  labelEn: string;
  actions: PermissionAction[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { module: "dashboard", labelZh: "数据概览", labelEn: "Dashboard", actions: ["view"] },
  { module: "products", labelZh: "商品管理", labelEn: "Products", actions: ["view", "create", "edit", "delete"] },
  { module: "orders", labelZh: "订单管理", labelEn: "Orders", actions: ["view", "create", "edit", "delete"] },
  { module: "purchasing", labelZh: "采购管理", labelEn: "Purchasing", actions: ["view", "create", "edit", "delete"] },
  { module: "suppliers", labelZh: "供应商信息", labelEn: "Suppliers", actions: ["view", "create", "edit", "delete"] },
  { module: "warehouses", labelZh: "仓库信息", labelEn: "Warehouses", actions: ["view", "create", "edit", "delete"] },
  { module: "inventory", labelZh: "库存管理", labelEn: "Inventory", actions: ["view", "create", "edit", "delete"] },
  { module: "finance", labelZh: "财务管理", labelEn: "Finance", actions: ["view", "create", "edit", "delete"] },
  { module: "analytics", labelZh: "数据分析", labelEn: "Analytics", actions: ["view"] },
  { module: "platforms", labelZh: "渠道管理", labelEn: "Channels", actions: ["view", "create", "edit", "delete"] },
  { module: "settings", labelZh: "系统设置", labelEn: "Settings", actions: ["view", "create", "edit", "delete"] },
];

// ─── All Permission Keys (flat list) ────────────────────────────────────────

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.actions.map((a) => `${g.module}.${a}`)
);

// ─── Permission Check ───────────────────────────────────────────────────────

export type PermissionMap = Record<string, boolean>;

export function hasPermission(
  role: string,
  permissions: PermissionMap | null | undefined,
  key: string
): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (!permissions) return false;
  return permissions[key] === true;
}

// ─── API Route Permission Check ─────────────────────────────────────────────

export function requirePermission(
  ctx: { role: string; permissions?: PermissionMap | null },
  key: string
): NextResponse | null {
  if (!hasPermission(ctx.role, ctx.permissions, key)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  return null;
}

// ─── Default Role Permissions ───────────────────────────────────────────────

function allTrue(): PermissionMap {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, true]));
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionMap> = {
  SUPER_ADMIN: allTrue(),
  STORE_ADMIN: allTrue(),
  OPERATOR: {
    "dashboard.view": true,
    "products.view": true,
    "products.create": true,
    "products.edit": true,
    "orders.view": true,
    "orders.create": true,
    "orders.edit": true,
    "purchasing.view": true,
    "purchasing.create": true,
    "purchasing.edit": true,
    "suppliers.view": true,
    "warehouses.view": true,
    "inventory.view": true,
    "inventory.create": true,
    "inventory.edit": true,
    "analytics.view": true,
  },
  CUSTOMER_SERVICE: {
    "dashboard.view": true,
    "orders.view": true,
    "orders.edit": true,
    "products.view": true,
    "inventory.view": true,
  },
  FINANCE: {
    "dashboard.view": true,
    "finance.view": true,
    "finance.create": true,
    "finance.edit": true,
    "finance.delete": true,
    "analytics.view": true,
    "orders.view": true,
    "purchasing.view": true,
  },
};
