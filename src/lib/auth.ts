import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./db";
import logger from "./logger";

// Simple sliding-window rate limiter for login attempts
const loginAttempts = new Map<string, number[]>();
const LOGIN_MAX = 5;
const LOGIN_WINDOW = 60_000; // 1 minute

function checkLoginRate(username: string): boolean {
  const now = Date.now();
  const attempts = (loginAttempts.get(username) || []).filter((t) => t > now - LOGIN_WINDOW);
  if (attempts.length >= LOGIN_MAX) {
    logger.warn({ username }, "Login rate limited");
    return false;
  }
  attempts.push(now);
  loginAttempts.set(username, attempts);
  // Periodic cleanup
  if (loginAttempts.size > 5_000) loginAttempts.clear();
  return true;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        if (!checkLoginRate(credentials.username)) return null;

        const ip = (req?.headers as any)?.["x-forwarded-for"]?.split(",")[0]?.trim()
          || (req?.headers as any)?.["x-real-ip"]
          || "unknown";
        const userAgent = (req?.headers as any)?.["user-agent"] || null;

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
            include: { stores: { include: { store: true } } },
          });

          if (!user || !user.isActive) {
            // Log failed attempt
            if (user) {
              await prisma.loginLog.create({
                data: { userId: user.id, ip, userAgent, success: false },
              }).catch(() => {});
            }
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) {
            await prisma.loginLog.create({
              data: { userId: user.id, ip, userAgent, success: false },
            }).catch(() => {});
            return null;
          }

          await Promise.all([
            prisma.user.update({
              where: { id: user.id },
              data: { lastLoginAt: new Date() },
            }),
            prisma.loginLog.create({
              data: { userId: user.id, ip, userAgent, success: true },
            }),
          ]);

          // Load permissions for default store
          const defaultStoreId = user.stores[0]?.store.id;
          let permissions: Record<string, boolean> = {};
          if (defaultStoreId && user.role !== "SUPER_ADMIN") {
            const su = user.stores[0];
            permissions = (su?.permissions as Record<string, boolean>) || {};
          }

          return {
            id: user.id,
            name: user.displayName || user.username,
            email: user.email,
            role: user.role,
            username: user.username,
            stores: user.stores.map((su) => ({
              id: su.store.id,
              name: su.store.name,
            })),
            permissions,
          } as any;
        } catch (err) {
          logger.error({ err }, "Login authorize error");
          throw new Error("AUTH_SYSTEM_ERROR");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.username = (user as any).username;
        token.stores = (user as any).stores;
        token.permissions = (user as any).permissions || {};
        token.permissionsLoadedAt = Date.now();
      }
      // Refresh permissions every 5 minutes
      if (
        token.role !== "SUPER_ADMIN" &&
        (!token.permissionsLoadedAt || Date.now() - (token.permissionsLoadedAt as number) > 5 * 60 * 1000)
      ) {
        try {
          const stores = (token.stores as any[]) || [];
          const storeId = stores[0]?.id;
          if (storeId && token.sub) {
            const su = await prisma.storeUser.findUnique({
              where: { storeId_userId: { storeId, userId: token.sub } },
              select: { permissions: true },
            });
            token.permissions = (su?.permissions as Record<string, boolean>) || {};
          }
        } catch {}
        token.permissionsLoadedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        (session.user as any).stores = token.stores;
        (session.user as any).permissions = token.permissions || {};
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
