import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;

      // Public routes — always allow
      if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
        return true;
      }
      if (pathname.startsWith("/api/platforms/callback")) {
        return true;
      }
      if (pathname === "/api/health") {
        return true;
      }

      // All other matched routes require a valid token
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    // Dashboard pages
    "/dashboard/:path*",
    "/products/:path*",
    "/orders/:path*",
    "/inventory/:path*",
    "/customers/:path*",
    "/finance/:path*",
    "/analytics/:path*",
    "/logistics/:path*",
    "/marketing/:path*",
    "/platforms/:path*",
    "/settings/:path*",
    "/purchasing/:path*",
    "/suppliers/:path*",
    // All API routes
    "/api/:path*",
  ],
};
