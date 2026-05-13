import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SessionProvider } from "@/components/providers/session-provider";
import zhMessages from "@/messages/zh.json";
import enMessages from "@/messages/en.json";
import msMessages from "@/messages/ms.json";
import "./globals.css";

export const metadata: Metadata = {
  title: "EcomHub | 电商管理系统",
  description: "Multi-platform e-commerce management system for Malaysian marketplaces",
};

const messagesMap: Record<string, any> = { zh: zhMessages, en: enMessages, ms: msMessages };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let locale = "zh";
  try {
    locale = await getLocale();
  } catch {
    locale = "zh";
  }
  const messages = messagesMap[locale] || zhMessages;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SessionProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
