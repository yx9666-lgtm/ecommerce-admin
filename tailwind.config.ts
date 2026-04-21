import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
        chart: {
          shopee: "#EE4D2D",
          lazada: "#0F146D",
          tiktok: "#000000",
          pgmall: "#E31837",
        },
        warm: {
          50: "#FFFBF5",
          100: "#FFF3E0",
          200: "#FFE0B2",
          300: "#FFCC80",
          400: "#FFB74D",
          500: "#FFA726",
          600: "#FB8C00",
          700: "#F57C00",
          800: "#5D3A00",
          900: "#3E2200",
        },
        gold: {
          50: "#FFFCF0",
          100: "#FFF5D6",
          200: "#FFE8A3",
          300: "#FFD866",
          400: "#FFC833",
          500: "#F0B400",
          600: "#D9A200",
          700: "#C29100",
          800: "#A67C00",
          900: "#7A5C00",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0, 0, 0, 0.06)",
        "glass-sm": "0 4px 16px rgba(0, 0, 0, 0.04)",
        "glass-lg": "0 12px 48px rgba(0, 0, 0, 0.08)",
        neu: "6px 6px 16px rgba(0, 0, 0, 0.06), -6px -6px 16px rgba(255, 255, 255, 0.8)",
        "neu-sm": "3px 3px 8px rgba(0, 0, 0, 0.05), -3px -3px 8px rgba(255, 255, 255, 0.7)",
        "neu-lg": "10px 10px 24px rgba(0, 0, 0, 0.07), -10px -10px 24px rgba(255, 255, 255, 0.85)",
        premium: "0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(255, 255, 255, 0.3)",
        "premium-hover": "0 8px 40px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(255, 255, 255, 0.4)",
        "glow-gold": "0 4px 24px rgba(240, 180, 0, 0.3), 0 0 0 1px rgba(240, 180, 0, 0.15)",
        "glow-gold-lg": "0 8px 40px rgba(240, 180, 0, 0.4), 0 0 0 1px rgba(240, 180, 0, 0.2)",
        "btn-gold": "0 2px 16px rgba(240, 180, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.06)",
        "btn-gold-hover": "0 4px 24px rgba(240, 180, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.08)",
        "sidebar-active": "0 2px 16px rgba(240, 180, 0, 0.35)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans SC", "system-ui", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(30px, -30px) scale(1.05)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.95)" },
        },
        "float-medium": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-40px, -20px) scale(1.08)" },
        },
        "float-reverse": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(25px, 35px) rotate(3deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float-slow": "float-slow 20s ease-in-out infinite",
        "float-medium": "float-medium 15s ease-in-out infinite",
        "float-reverse": "float-reverse 18s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
