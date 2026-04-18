import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * AUTHENTICATION & ROLE-BASED ACCESS CONTROL MIDDLEWARE
 * Proteksi rute menggunakan NextAuth. Menentukan siapa yang boleh mengakses 
 * halaman tertentu berdasarkan peran (Role) yang disimpan dalam JWT token.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. Role-based Path Access Control
    // Only PROCUREMENT and SUPERADMIN can access user management
    if (path.startsWith("/users")) {
      if (token?.role !== "PROCUREMENT" && token?.role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Example of other restrictions if needed:
    // Only QA and SUPERADMIN can access training
    if (path.startsWith("/qa-training")) {
      if (token?.role !== "QA" && token?.role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Return true if sessions exists
    },
    pages: {
      signIn: "/", // Redirect to home/login if not authorized
    },
  }
);

// Define which paths are protected by this middleware
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/requests/:path*",
    "/data-team/:path*",
    "/users/:path*",
    "/qa-training/:path*",
    "/certificates/:path*",
    "/api-docs/:path*",
  ],
};
