"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
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
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Link2,
  ClipboardList,
  Building2,
  Container,
} from "lucide-react";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "dashboard.page.view" },
  { key: "orders", href: "/orders", icon: ShoppingCart, permission: "orders.page.view" },
  { key: "inventory", href: "/inventory", icon: Warehouse, permission: "inventory.page.view" },
  { key: "products", href: "/products", icon: Package, permission: "products.page.view" },
  { key: "platforms", href: "/platforms", icon: Link2, permission: "platforms.page.view" },
  { key: "purchasing", href: "/purchasing", icon: ClipboardList, permission: "purchasing.page.view" },
  { key: "suppliers", href: "/suppliers", icon: Building2, permission: "suppliers.page.view" },
  { key: "warehouses", href: "/warehouses", icon: Container, permission: "warehouses.page.view" },
  { key: "finance", href: "/finance", icon: DollarSign, permission: "finance.page.view" },
  { key: "analytics", href: "/analytics", icon: BarChart3, permission: "analytics.page.view" },
  { key: "settings", href: "/settings", icon: Settings, permission: "settings.page.view" },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const sidebarCollapsed = useAuthStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAuthStore((s) => s.toggleSidebar);
  const { can } = usePermissions();

  const visibleNavItems = navItems.filter((item) => can(item.permission));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300",
        "glass-sidebar text-foreground shadow-glass-lg",
        sidebarCollapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-border/30",
          sidebarCollapsed ? "justify-center" : "gap-3"
        )}
      >
        <div className="w-9 h-9 bg-gradient-gold rounded-xl shadow-glow-gold ring-2 ring-gold-200/30 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-bold text-base leading-tight text-foreground">EcomHub</h1>
            <p className="text-[10px] text-muted-foreground">Malaysia</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <nav className="space-y-1 px-3">
          {visibleNavItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.key}
                href={item.href}
                title={sidebarCollapsed ? t(item.key) : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gold-400/15 text-gold-600 dark:text-gold-400 shadow-sidebar-active ring-1 ring-gold-500/20"
                    : "text-muted-foreground hover:bg-muted dark:hover:bg-muted hover:text-foreground",
                  sidebarCollapsed && "justify-center px-2"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-gold-600 dark:text-gold-400" : "text-muted-foreground")}
                />
                {!sidebarCollapsed && <span>{t(item.key)}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Collapse Button */}
      <div className="border-t border-border/30 p-3">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full rounded-full py-2 text-muted-foreground hover:bg-muted dark:hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </aside>
  );
}
