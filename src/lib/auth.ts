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
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        if (!checkLoginRate(credentials.username)) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username },
            include: { stores: { include: { store: true } } },
          });

          if (!user || !user.isActive) return null;

          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isValid) return null;

          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

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
          } as any;
        } catch {
          return null;
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        (session.user as any).stores = token.stores;
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
