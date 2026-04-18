"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  DollarSign,
  BarChart3,
  Settings,
  Link2,
  ClipboardList,
  Building2,
  LogOut,
  Container,
} from "lucide-react";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "products", href: "/products", icon: Package },
  { key: "orders", href: "/orders", icon: ShoppingCart },
  { key: "purchasing", href: "/purchasing", icon: ClipboardList },
  { key: "suppliers", href: "/suppliers", icon: Building2 },
  { key: "warehouses", href: "/warehouses", icon: Container },
  { key: "inventory", href: "/inventory", icon: Warehouse },
  { key: "finance", href: "/finance", icon: DollarSign },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "platforms", href: "/platforms", icon: Link2 },
  { key: "settings", href: "/settings", icon: Settings },
];

export function TopNav() {
  const t = useTranslations("nav");
  const tAuth = useTranslations("auth");
  const pathname = usePathname();

  return (
    <div className="glass-topnav">
      <nav className="flex items-center gap-0.5 px-4 h-11 overflow-x-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium flex-shrink-0 transition-all duration-200",
                isActive
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sidebar-active ring-1 ring-amber-500/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
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
