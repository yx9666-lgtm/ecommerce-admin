"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Globe, Sun, Moon, ShoppingBag, Clock, Calendar } from "lucide-react";

function useClock(locale: "zh" | "en" | "ms") {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const weekdaysByLocale: Record<"zh" | "en" | "ms", string[]> = {
    zh: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    ms: ["Ahd", "Isn", "Sel", "Rab", "Kha", "Jum", "Sab"],
  };

  const date =
    locale === "zh"
      ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
      : now.toLocaleDateString(locale === "ms" ? "ms-MY" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

  const time = now.toLocaleTimeString(locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: locale !== "ms",
  });

  return { date, weekday: weekdaysByLocale[locale][now.getDay()], time };
}

export function Header() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useAuthStore((s) => s.locale);
  const setLocale = useAuthStore((s) => s.setLocale);
  const theme = useAuthStore((s) => s.theme);
  const toggleTheme = useAuthStore((s) => s.toggleTheme);

  const localeCycle: Array<"zh" | "en" | "ms"> = ["zh", "en", "ms"];
  const localeBadge: Record<"zh" | "en" | "ms", string> = { zh: "中", en: "EN", ms: "BM" };

  const clock = useClock(locale);

  const toggleLocale = () => {
    const index = localeCycle.indexOf(locale);
    const newLocale = localeCycle[(index + 1) % localeCycle.length];
    setLocale(newLocale);
    router.refresh();
  };

  const isDark = theme === "dark";

  return (
    <header className="flex h-16 items-center gap-4 glass-header px-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mr-4 flex-shrink-0">
        <div className="w-9 h-9 bg-gradient-gold rounded-xl shadow-glow-gold ring-2 ring-gold-200/30 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight text-foreground">EcomHub</h1>
          <p className="text-[10px] text-muted-foreground">Malaysia</p>
        </div>
      </div>

      <div className="flex-1" />

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
          <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold bg-gold-600 text-white rounded px-0.5">
            {localeBadge[locale]}
          </span>
        </Button>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-border/50 hidden lg:block" />

      {/* Date & Time */}
      <div className="hidden lg:flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span className="text-xs">{clock.date} {clock.weekday}</span>
        <div className="h-4 w-px bg-border/50" />
        <Clock className="h-4 w-4" />
        <span className="text-xs font-mono tabular-nums">{clock.time}</span>
      </div>
    </header>
  );
}
