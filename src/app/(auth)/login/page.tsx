"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import {
  ShoppingBag,
  Globe,
  Eye,
  EyeOff,
  Loader2,
  Store,
  BarChart3,
  Package,
  Truck,
} from "lucide-react";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const locale = useAuthStore((s) => s.locale);
  const setLocale = useAuthStore((s) => s.setLocale);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    useAuthStore.persist.rehydrate();
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "CredentialsSignin") {
        setError(t("auth.loginError"));
      } else {
        setError(t("auth.loginSystemError"));
      }
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const toggleLocale = () => {
    const newLocale = locale === "zh" ? "en" : "zh";
    setLocale(newLocale);
    window.location.reload();
  };

  const currentLocale = mounted ? locale : "zh";

  const features = [
    { icon: Store, label: currentLocale === "zh" ? "多平台管理" : "Multi-Platform" },
    { icon: Package, label: currentLocale === "zh" ? "商品库存" : "Inventory" },
    { icon: BarChart3, label: currentLocale === "zh" ? "数据分析" : "Analytics" },
    { icon: Truck, label: currentLocale === "zh" ? "物流追踪" : "Logistics" },
  ];

  return (
    <div className="min-h-screen flex bg-warm-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gold-500 via-gold-600 to-gold-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">EcomHub</h1>
              <p className="text-gold-200 text-sm">Malaysia Edition</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold leading-tight mb-4">
            {currentLocale === "zh" ? "统一管理您的电商帝国" : "Manage Your E-Commerce Empire"}
          </h2>
          <p className="text-gold-200 text-lg mb-12 max-w-md">
            {currentLocale === "zh"
              ? "连接 Shopee、Lazada、TikTok Shop、PG Mall，一站式管理订单、商品、库存与财务。"
              : "Connect Shopee, Lazada, TikTok Shop, PG Mall. Manage orders, products, inventory & finance in one place."}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-3"
              >
                <f.icon className="w-5 h-5 text-gold-200" />
                <span className="text-sm font-medium">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-16 flex items-center gap-6">
            <div className="flex -space-x-2">
              {[
                { color: "bg-orange-500", letter: "S" },
                { color: "bg-blue-800", letter: "L" },
                { color: "bg-black", letter: "T" },
                { color: "bg-red-600", letter: "P" },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 ${item.color} rounded-full border-2 border-gold-700 flex items-center justify-center`}
                >
                  <span className="text-white text-xs font-bold">{item.letter}</span>
                </div>
              ))}
            </div>
            <span className="text-gold-200 text-sm">
              {currentLocale === "zh"
                ? "支持马来西亚 4 大电商平台"
                : "Supporting 4 major MY platforms"}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-background transition-colors duration-300">
        {/* Decorative orb */}
        <div className="absolute top-1/4 right-0 w-[300px] h-[300px] rounded-full opacity-30 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(240, 180, 0, 0.4), transparent 70%)", filter: "blur(60px)" }} />
        {/* Language Toggle */}
        <div className="flex justify-end p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="gap-2 text-muted-foreground"
          >
            <Globe className="w-4 h-4" />
            {currentLocale === "zh" ? "English" : "中文"}
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 relative z-10">
          <div className="w-full max-w-[400px]">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-gold rounded-xl shadow-glow-gold flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">EcomHub</span>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">{t("auth.loginTitle")}</h2>
                <p className="text-muted-foreground">{t("auth.loginSubtitle")}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-foreground">
                    {t("auth.username")}
                  </Label>
                  <Input
                    id="username"
                    placeholder={currentLocale === "zh" ? "请输入用户名" : "Enter username"}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    className="h-11 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">
                    {t("auth.password")}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={currentLocale === "zh" ? "请输入密码" : "Enter password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="h-11 pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    t("auth.loginButton")
                  )}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  {currentLocale === "zh"
                    ? "默认账号：admin / admin123"
                    : "Default: admin / admin123"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 text-center text-xs text-muted-foreground">
          © 2024 EcomHub. All rights reserved.
        </div>
      </div>
    </div>
  );
}
