"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { TopNav } from "@/components/layout/top-nav";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const theme = useAuthStore((s) => s.theme);

  useEffect(() => {
    useAuthStore.persist.rehydrate();
    setMounted(true);
  }, []);

  // Sync theme to <html> element
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme, mounted]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || !mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto" />
          <p className="mt-3 text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isDark = theme === "dark";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background transition-colors duration-300">
      {/* Floating decorative orbs — only in light mode */}
      {!isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div
            className="absolute animate-float-slow"
            style={{
              top: "-10%",
              right: "-5%",
              width: "600px",
              height: "600px",
              borderRadius: "40% 60% 55% 45% / 55% 40% 60% 45%",
              background: "linear-gradient(135deg, rgba(255, 213, 79, 0.25) 0%, rgba(255, 179, 0, 0.15) 50%, rgba(255, 160, 0, 0.08) 100%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute animate-float-medium"
            style={{
              top: "30%",
              left: "-8%",
              width: "450px",
              height: "450px",
              borderRadius: "55% 45% 50% 50% / 45% 55% 45% 55%",
              background: "linear-gradient(180deg, rgba(255, 236, 179, 0.3) 0%, rgba(255, 204, 128, 0.15) 100%)",
              filter: "blur(70px)",
            }}
          />
          <div
            className="absolute animate-float-reverse"
            style={{
              bottom: "5%",
              right: "15%",
              width: "350px",
              height: "350px",
              borderRadius: "50% 50% 45% 55% / 60% 40% 60% 40%",
              background: "linear-gradient(45deg, rgba(255, 224, 178, 0.25) 0%, rgba(255, 193, 7, 0.1) 100%)",
              filter: "blur(50px)",
            }}
          />
          <div
            className="absolute animate-float-medium"
            style={{
              top: "10%",
              left: "20%",
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 213, 79, 0.2) 0%, transparent 70%)",
              filter: "blur(40px)",
              animationDelay: "-7s",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="sticky top-0 z-30">
          <Header />
          <TopNav />
        </div>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
