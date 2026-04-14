"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Globe, Search, LogOut, User, Settings, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";

const pageTitles: Record<string, string> = {
  "/dashboard": "dashboard",
  "/products": "products",
  "/orders": "orders",
  "/inventory": "inventory",
  "/customers": "customers",
  "/finance": "finance",
  "/analytics": "analytics",
  "/logistics": "logistics",
  "/marketing": "marketing",
  "/purchasing": "purchasing",
  "/suppliers": "suppliers",
  "/platforms": "platforms",
  "/settings": "settings",
};

export function Header() {
  const { data: session } = useSession();
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const locale = useAuthStore((s) => s.locale);
  const setLocale = useAuthStore((s) => s.setLocale);
  const theme = useAuthStore((s) => s.theme);
  const toggleTheme = useAuthStore((s) => s.toggleTheme);

  const currentPage = Object.entries(pageTitles).find(([path]) =>
    pathname.startsWith(path)
  );
  const pageTitle = currentPage ? t(`nav.${currentPage[1]}`) : "";

  const toggleLocale = () => {
    const newLocale = locale === "zh" ? "en" : "zh";
    setLocale(newLocale);
    router.refresh();
  };

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "A";

  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 glass-header px-6">
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-foreground">{pageTitle}</h2>
      </div>

      <div className="hidden md:flex items-center gap-2 bg-muted dark:bg-muted rounded-full px-4 py-2 w-80 border border-border shadow-neu-sm transition-all duration-200 focus-within:border-amber-200/40">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("common.search") + "..."}
          className="border-0 bg-transparent h-7 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
        />
      </div>

      <div className="flex items-center gap-1">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="relative text-muted-foreground hover:text-foreground"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Locale Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLocale}
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Globe className="h-5 w-5" />
          <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold bg-amber-600 text-white rounded px-0.5">
            {locale === "zh" ? "EN" : "中"}
          </span>
        </Button>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="h-8 w-8 ring-2 ring-amber-300/50 ring-offset-1 ring-offset-background">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium text-foreground">
                {session?.user?.name || "Admin"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{session?.user?.name || "Admin"}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {session?.user?.email || "admin@ecomhub.my"}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              {t("nav.profile")}
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              {t("nav.settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("auth.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
