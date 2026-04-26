import { NextResponse } from "next/server";

// ─── Permission Key Constants ───────────────────────────────────────────────

export const PERMISSIONS = {
  dashboard: {
    view: "dashboard.view",
    pageView: "dashboard.page.view",
  },
  products: {
    view: "products.view",
    create: "products.create",
    edit: "products.edit",
    delete: "products.delete",
    pageView: "products.page.view",
    tableView: "products.table.view",
  },
  orders: {
    view: "orders.view",
    create: "orders.create",
    edit: "orders.edit",
    delete: "orders.delete",
    pageView: "orders.page.view",
    tableView: "orders.table.view",
  },
  purchasing: {
    view: "purchasing.view",
    create: "purchasing.create",
    edit: "purchasing.edit",
    delete: "purchasing.delete",
    pageView: "purchasing.page.view",
    tableView: "purchasing.table.view",
  },
  suppliers: {
    view: "suppliers.view",
    create: "suppliers.create",
    edit: "suppliers.edit",
    delete: "suppliers.delete",
    pageView: "suppliers.page.view",
    tableView: "suppliers.table.view",
  },
  warehouses: {
    view: "warehouses.view",
    create: "warehouses.create",
    edit: "warehouses.edit",
    delete: "warehouses.delete",
    pageView: "warehouses.page.view",
    tableView: "warehouses.table.view",
  },
  inventory: {
    view: "inventory.view",
    create: "inventory.create",
    edit: "inventory.edit",
    delete: "inventory.delete",
    pageView: "inventory.page.view",
    tableView: "inventory.table.view",
  },
  finance: {
    view: "finance.view",
    create: "finance.create",
    edit: "finance.edit",
    delete: "finance.delete",
    pageView: "finance.page.view",
    tableView: "finance.table.view",
  },
  analytics: {
    view: "analytics.view",
    pageView: "analytics.page.view",
    tableView: "analytics.table.view",
  },
  customers: {
    view: "customers.view",
    pageView: "customers.page.view",
    tableView: "customers.table.view",
  },
  logistics: {
    view: "logistics.view",
    pageView: "logistics.page.view",
    tableView: "logistics.table.view",
  },
  marketing: {
    view: "marketing.view",
    create: "marketing.create",
    edit: "marketing.edit",
    delete: "marketing.delete",
    pageView: "marketing.page.view",
    tableView: "marketing.table.view",
  },
  platforms: {
    view: "platforms.view",
    create: "platforms.create",
    edit: "platforms.edit",
    delete: "platforms.delete",
    pageView: "platforms.page.view",
    tableView: "platforms.table.view",
  },
  settings: {
    view: "settings.view",
    create: "settings.create",
    edit: "settings.edit",
    delete: "settings.delete",
    pageView: "settings.page.view",
    tableView: "settings.table.view",
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
  { module: "dashboard.page", labelZh: "数据概览页面", labelEn: "Dashboard Page", actions: ["view"] },

  { module: "products", labelZh: "商品管理", labelEn: "Products", actions: ["view", "create", "edit", "delete"] },
  { module: "products.page", labelZh: "商品管理页面", labelEn: "Products Page", actions: ["view"] },
  { module: "products.table", labelZh: "商品管理表格", labelEn: "Products Table", actions: ["view"] },

  { module: "orders", labelZh: "订单管理", labelEn: "Orders", actions: ["view", "create", "edit", "delete"] },
  { module: "orders.page", labelZh: "订单管理页面", labelEn: "Orders Page", actions: ["view"] },
  { module: "orders.table", labelZh: "订单管理表格", labelEn: "Orders Table", actions: ["view"] },

  { module: "purchasing", labelZh: "采购管理", labelEn: "Purchasing", actions: ["view", "create", "edit", "delete"] },
  { module: "purchasing.page", labelZh: "采购管理页面", labelEn: "Purchasing Page", actions: ["view"] },
  { module: "purchasing.table", labelZh: "采购管理表格", labelEn: "Purchasing Table", actions: ["view"] },

  { module: "suppliers", labelZh: "供应商信息", labelEn: "Suppliers", actions: ["view", "create", "edit", "delete"] },
  { module: "suppliers.page", labelZh: "供应商页面", labelEn: "Suppliers Page", actions: ["view"] },
  { module: "suppliers.table", labelZh: "供应商表格", labelEn: "Suppliers Table", actions: ["view"] },

  { module: "warehouses", labelZh: "仓库信息", labelEn: "Warehouses", actions: ["view", "create", "edit", "delete"] },
  { module: "warehouses.page", labelZh: "仓库页面", labelEn: "Warehouses Page", actions: ["view"] },
  { module: "warehouses.table", labelZh: "仓库表格", labelEn: "Warehouses Table", actions: ["view"] },

  { module: "inventory", labelZh: "库存管理", labelEn: "Inventory", actions: ["view", "create", "edit", "delete"] },
  { module: "inventory.page", labelZh: "库存页面", labelEn: "Inventory Page", actions: ["view"] },
  { module: "inventory.table", labelZh: "库存表格", labelEn: "Inventory Table", actions: ["view"] },

  { module: "finance", labelZh: "财务管理", labelEn: "Finance", actions: ["view", "create", "edit", "delete"] },
  { module: "finance.page", labelZh: "财务页面", labelEn: "Finance Page", actions: ["view"] },
  { module: "finance.table", labelZh: "财务表格", labelEn: "Finance Table", actions: ["view"] },

  { module: "analytics", labelZh: "数据分析", labelEn: "Analytics", actions: ["view"] },
  { module: "analytics.page", labelZh: "数据分析页面", labelEn: "Analytics Page", actions: ["view"] },
  { module: "analytics.table", labelZh: "数据分析表格", labelEn: "Analytics Table", actions: ["view"] },

  { module: "customers", labelZh: "客户管理", labelEn: "Customers", actions: ["view"] },
  { module: "customers.page", labelZh: "客户页面", labelEn: "Customers Page", actions: ["view"] },
  { module: "customers.table", labelZh: "客户表格", labelEn: "Customers Table", actions: ["view"] },

  { module: "logistics", labelZh: "物流管理", labelEn: "Logistics", actions: ["view"] },
  { module: "logistics.page", labelZh: "物流页面", labelEn: "Logistics Page", actions: ["view"] },
  { module: "logistics.table", labelZh: "物流表格", labelEn: "Logistics Table", actions: ["view"] },

  { module: "marketing", labelZh: "营销管理", labelEn: "Marketing", actions: ["view", "create", "edit", "delete"] },
  { module: "marketing.page", labelZh: "营销页面", labelEn: "Marketing Page", actions: ["view"] },
  { module: "marketing.table", labelZh: "营销表格", labelEn: "Marketing Table", actions: ["view"] },

  { module: "platforms", labelZh: "渠道管理", labelEn: "Channels", actions: ["view", "create", "edit", "delete"] },
  { module: "platforms.page", labelZh: "渠道页面", labelEn: "Channels Page", actions: ["view"] },
  { module: "platforms.table", labelZh: "渠道表格", labelEn: "Channels Table", actions: ["view"] },

  { module: "settings", labelZh: "系统设置", labelEn: "Settings", actions: ["view", "create", "edit", "delete"] },
  { module: "settings.page", labelZh: "系统设置页面", labelEn: "Settings Page", actions: ["view"] },
  { module: "settings.table", labelZh: "系统设置表格", labelEn: "Settings Table", actions: ["view"] },
];

// ─── All Permission Keys (flat list) ────────────────────────────────────────

export const ALL_PERMISSION_KEYS: string[] = Array.from(
  new Set(
    PERMISSION_GROUPS.flatMap((g) =>
      g.actions.map((a) => `${g.module}.${a}`)
    )
  )
);

// ─── Permission Check ───────────────────────────────────────────────────────

export type PermissionMap = Record<string, boolean>;

function hasOwnPermission(permissions: PermissionMap, key: string) {
  return Object.prototype.hasOwnProperty.call(permissions, key);
}

function getPermissionAliases(key: string): string[] {
  const aliases = new Set<string>();

  const legacy = key.match(/^([^.]+)\.(view|create|edit|delete)$/);
  if (legacy) {
    const moduleName = legacy[1];
    const action = legacy[2];
    if (action === "view") {
      aliases.add(`${moduleName}.page.view`);
      aliases.add(`${moduleName}.table.view`);
    } else {
      aliases.add(`${moduleName}.action.${action}`);
    }
  }

  const pageView = key.match(/^([^.]+)\.page\.view$/);
  if (pageView) aliases.add(`${pageView[1]}.view`);

  const tableView = key.match(/^([^.]+)\.table\.view$/);
  if (tableView) aliases.add(`${tableView[1]}.view`);

  const action = key.match(/^([^.]+)\.action\.(create|edit|delete)$/);
  if (action) aliases.add(`${action[1]}.${action[2]}`);

  const columnView = key.match(/^([^.]+)\.column\..+\.view$/);
  if (columnView) aliases.add(`${columnView[1]}.view`);

  return Array.from(aliases);
}

function resolvePermissionFromMap(permissions: PermissionMap, key: string): boolean {
  if (hasOwnPermission(permissions, key)) {
    return permissions[key] === true;
  }

  const aliases = getPermissionAliases(key);
  let hasAliasValue = false;
  for (const alias of aliases) {
    if (!hasOwnPermission(permissions, alias)) continue;
    hasAliasValue = true;
    if (permissions[alias] === true) return true;
  }

  return hasAliasValue ? false : false;
}

export function hasPermission(
  role: string,
  permissions: PermissionMap | null | undefined,
  key: string
): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (!permissions) return false;
  return resolvePermissionFromMap(permissions, key);
}

export function expandPermissionMap(input: PermissionMap | null | undefined): PermissionMap {
  const source: PermissionMap = input ? { ...input } : {};
  const expanded: PermissionMap = { ...source };

  for (const key of ALL_PERMISSION_KEYS) {
    if (hasOwnPermission(expanded, key)) continue;
    expanded[key] = resolvePermissionFromMap(source, key);
  }

  return expanded;
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
