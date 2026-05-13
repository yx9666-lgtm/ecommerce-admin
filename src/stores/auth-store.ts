import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface AuthStore {
  locale: "zh" | "en" | "ms";
  currentStoreId: string | null;
  sidebarCollapsed: boolean;
  theme: "light" | "dark";
  setLocale: (locale: "zh" | "en" | "ms") => void;
  setCurrentStoreId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleTheme: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      locale: "zh",
      currentStoreId: null,
      sidebarCollapsed: false,
      theme: "light",
      setLocale: (locale) => {
        set({ locale });
        if (typeof document !== "undefined") {
          document.cookie = `locale=${locale};path=/;max-age=31536000`;
        }
      },
      setCurrentStoreId: (id) => set({ currentStoreId: id }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
    }),
    {
      name: "ecommerce-auth",
      skipHydration: true,
    }
  )
);
