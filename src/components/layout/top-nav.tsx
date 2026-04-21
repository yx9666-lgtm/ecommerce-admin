"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  DollarSign,
  BarChart3,
  Megaphone,
  Settings,
  Link2,
  ClipboardList,
  Building2,
  LogOut,
  Container,
} from "lucide-react";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { key: "products", href: "/products", icon: Package, permission: "products.view" },
  { key: "orders", href: "/orders", icon: ShoppingCart, permission: "orders.view" },
  { key: "purchasing", href: "/purchasing", icon: ClipboardList, permission: "purchasing.view" },
  { key: "suppliers", href: "/suppliers", icon: Building2, permission: "suppliers.view" },
  { key: "warehouses", href: "/warehouses", icon: Container, permission: "warehouses.view" },
  { key: "inventory", href: "/inventory", icon: Warehouse, permission: "inventory.view" },
  { key: "finance", href: "/finance", icon: DollarSign, permission: "finance.view" },
  { key: "analytics", href: "/analytics", icon: BarChart3, permission: "analytics.view" },
  { key: "platforms", href: "/platforms", icon: Link2, permission: "platforms.view" },
  { key: "settings", href: "/settings", icon: Settings, permission: "settings.view" },
];

export function TopNav() {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleNavItems = navItems.filter((item) => can(item.permission));

  return (
    <div className="glass-topnav">
      <nav className="flex items-center gap-0.5 px-4 h-11 overflow-x-auto scrollbar-thin">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium flex-shrink-0 transition-all duration-200",
                isActive
                  ? "bg-gold-400/15 text-gold-600 dark:text-gold-400 shadow-sidebar-active ring-1 ring-gold-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-gold-600 dark:text-gold-400" : "text-muted-foreground"
                )}
              />
              <span>{t(item.key)}</span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="h-5 w-px bg-border/50 mx-1 flex-shrink-0" />

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium flex-shrink-0 transition-all duration-200 text-red-500 hover:bg-red-500/10 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>{tAuth("logout")}</span>
        </button>
      </nav>
    </div>
  );
}
