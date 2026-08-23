import NextAuth from "next-auth"
import authConfig from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig);

export const proxy = auth(async (req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role as string | undefined;

  const isAdminRoute = nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/");
  const isShowroomRoute = nextUrl.pathname === "/showroom" || nextUrl.pathname.startsWith("/showroom/");
  const isEmployeeRoute = nextUrl.pathname === "/employee" || nextUrl.pathname.startsWith("/employee/");
  const isWholesalerRoute = nextUrl.pathname === "/wholesaler" || nextUrl.pathname.startsWith("/wholesaler/");
  const isAuthRoute = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");

  // 1. Redirection for logged-in users on Auth routes (Login/Register)
  if (isAuthRoute && isLoggedIn) {
    if (role === "admin" || role === "super_admin" || role === "manager") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
    if (role === "showroom_manager") {
      return NextResponse.redirect(new URL("/showroom/dashboard", nextUrl));
    }
    if (role === "employee") {
      return NextResponse.redirect(new URL("/employee/dashboard", nextUrl));
    }
    if (role === "wholesaler") {
      return NextResponse.redirect(new URL("/wholesaler/dashboard", nextUrl));
    }
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // 2. Protection for Admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    // showroom_manager, employee, wholesaler cannot access admin routes
    if (role === "showroom_manager") {
      return NextResponse.redirect(new URL("/showroom/dashboard", nextUrl));
    }
    if (role === "employee") {
      return NextResponse.redirect(new URL("/employee/dashboard", nextUrl));
    }
    if (role === "wholesaler") {
      return NextResponse.redirect(new URL("/wholesaler/dashboard", nextUrl));
    }
    // Only allow admin/super_admin/manager on admin routes
    if (role !== "admin" && role !== "super_admin" && role !== "manager") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    // Restriction for managers on non-authorized routes
    if (role === "manager") {
      const allowedPaths = [
        "/admin/dashboard",
        "/admin/products",
        "/admin/categories",
        "/admin/orders",
        "/admin/offers",
        "/admin/chalans",
        "/admin/bills",
        "/admin/abandoned-carts",
        "/admin/cms",
        "/admin/landing-pages",
        "/admin/catalog",
        "/admin/blogs",
        "/admin/expenses"
      ];
      const isPathAllowed = allowedPaths.some(path =>
        nextUrl.pathname === path || nextUrl.pathname.startsWith(path + "/")
      );
      if (!isPathAllowed) {
        return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
      }
    }
    // /admin/system-design → strictly super_admin
    const isSystemDesignRoute = nextUrl.pathname.startsWith("/admin/system-design");
    if (isSystemDesignRoute && role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
  }

  // 3. Protection for Showroom routes
  if (isShowroomRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (role !== "showroom_manager") {
      if (role === "admin" || role === "super_admin" || role === "manager") {
        return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
      }
      if (role === "employee") {
        return NextResponse.redirect(new URL("/employee/dashboard", nextUrl));
      }
      if (role === "wholesaler") {
        return NextResponse.redirect(new URL("/wholesaler/dashboard", nextUrl));
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // 4. Protection for Employee routes
  if (isEmployeeRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (!role || !['employee', 'showroom_manager', 'manager'].includes(role)) {
      if (role === "admin" || role === "super_admin" || role === "manager") {
        return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
      }
      if (role === "showroom_manager") {
        return NextResponse.redirect(new URL("/showroom/dashboard", nextUrl));
      }
      if (role === "wholesaler") {
        return NextResponse.redirect(new URL("/wholesaler/dashboard", nextUrl));
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // 5. Protection for Wholesaler routes
  if (isWholesalerRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
    if (role !== "wholesaler") {
      if (role === "admin" || role === "super_admin" || role === "manager") {
        return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
      }
      if (role === "showroom_manager") {
        return NextResponse.redirect(new URL("/showroom/dashboard", nextUrl));
      }
      if (role === "employee") {
        return NextResponse.redirect(new URL("/employee/dashboard", nextUrl));
      }
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  // 6. Redirect /dashboard route based on role
  if (nextUrl.pathname === "/dashboard" || nextUrl.pathname.startsWith("/dashboard/")) {
    if (role === "admin" || role === "super_admin" || role === "manager") {
      return NextResponse.redirect(new URL("/admin/dashboard", nextUrl));
    }
    if (role === "showroom_manager") {
      return NextResponse.redirect(new URL("/showroom/dashboard", nextUrl));
    }
    if (role === "employee") {
      return NextResponse.redirect(new URL("/employee/dashboard", nextUrl));
    }
    if (role === "wholesaler") {
      return NextResponse.redirect(new URL("/wholesaler/dashboard", nextUrl));
    }
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", nextUrl));
    }
  }

  req.headers.set('x-pathname', nextUrl.pathname);
  const response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });
  response.headers.set('x-pathname', nextUrl.pathname);
  return response;
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
