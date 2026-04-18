"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
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
} from "lucide-react";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "products", href: "/products", icon: Package },
  { key: "orders", href: "/orders", icon: ShoppingCart },
  { key: "purchasing", href: "/purchasing", icon: ClipboardList },
  { key: "suppliers", href: "/suppliers", icon: Building2 },
  { key: "inventory", href: "/inventory", icon: Warehouse },
  { key: "finance", href: "/finance", icon: DollarSign },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "marketing", href: "/marketing", icon: Megaphone },
  { key: "platforms", href: "/platforms", icon: Link2 },
  { key: "settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const sidebarCollapsed = useAuthStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAuthStore((s) => s.toggleSidebar);

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
        <div className="w-9 h-9 bg-gradient-gold rounded-xl shadow-glow-gold ring-2 ring-amber-200/30 flex items-center justify-center flex-shrink-0">
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
          {navItems.map((item) => {
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
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sidebar-active ring-1 ring-amber-500/20"
                    : "text-muted-foreground hover:bg-muted dark:hover:bg-muted hover:text-foreground",
                  sidebarCollapsed && "justify-center px-2"
                )}
              >
                <item.icon
                  className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}
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
