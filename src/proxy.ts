import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_CUSTOMER_ROUTES = [
  "/orders",
  "/bookings",
  "/profile",
  "/inbox",
  "/returns",
  "/warranties",
  "/complaints",
  "/favorites",
  "/history",
  "/checkout",
  "/payments",
];

const OPERATIONAL_PREFIXES = [
  "/provider",
  "/worker",
  "/merchant",
  "/supplier",
  "/ops",
  "/support",
  "/finance",
  "/business",
  "/ceo",
  "/executive",
  "/admin",
  "/staff",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token =
    request.cookies.get("servio_token")?.value ||
    request.cookies.get("servio_session")?.value;
  const guestVal = request.cookies.get("servio_guest")?.value;
  const activeRole = request.cookies.get("servio_active_role")?.value;

  // User is authenticated if session token is present OR servio_guest === "0" with active role
  const isAuthenticated = Boolean(
    (token && token.trim() !== "") ||
    (guestVal === "0" && activeRole && activeRole !== "GUEST")
  );
  const isGuest = !isAuthenticated;

  // If already authenticated and visiting login or register, redirect to appropriate role home
  if ((pathname.startsWith("/auth/login") || pathname === "/login") && !isGuest) {
    const activeRole = request.cookies.get("servio_active_role")?.value;
    const dest =
      activeRole === "CEO_PRODUCT_OWNER"
        ? "/ceo/dashboard"
        : activeRole === "ADMIN_OPERATIONS"
        ? "/admin/dashboard"
        : activeRole === "SERVICE_PROVIDER"
        ? "/provider/dashboard"
        : activeRole === "WORKER_TECHNICIAN"
        ? "/worker/dashboard"
        : activeRole === "MERCHANT"
        ? "/merchant/dashboard"
        : activeRole === "SUPPLIER"
        ? "/supplier/dashboard"
        : activeRole === "CUSTOMER_SUPPORT"
        ? "/support/dashboard"
        : activeRole === "FINANCE_PAYMENT_OPS"
        ? "/finance/dashboard"
        : "/";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // Alias /business/provider to /provider
  if (pathname.startsWith("/business/provider")) {
    const targetUrl = new URL(pathname.replace("/business/provider", "/provider"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /business/worker to /worker
  if (pathname.startsWith("/business/worker")) {
    const targetUrl = new URL(pathname.replace("/business/worker", "/worker"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /business/merchant to /merchant
  if (pathname.startsWith("/business/merchant")) {
    const targetUrl = new URL(pathname.replace("/business/merchant", "/merchant"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /business/supplier to /supplier
  if (pathname.startsWith("/business/supplier")) {
    const targetUrl = new URL(pathname.replace("/business/supplier", "/supplier"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /ops/support to /support
  if (pathname.startsWith("/ops/support")) {
    const targetUrl = new URL(pathname.replace("/ops/support", "/support"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /ops/finance to /finance
  if (pathname.startsWith("/ops/finance")) {
    const targetUrl = new URL(pathname.replace("/ops/finance", "/finance"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /ops/admin to /admin
  if (pathname.startsWith("/ops/admin")) {
    const targetUrl = new URL(pathname.replace("/ops/admin", "/admin"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /ops/staff to /staff
  if (pathname.startsWith("/ops/staff")) {
    const targetUrl = new URL(pathname.replace("/ops/staff", "/staff"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /executive/ceo to /ceo
  if (pathname.startsWith("/executive/ceo")) {
    const targetUrl = new URL(pathname.replace("/executive/ceo", "/ceo"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Alias /ops/executive to /ceo
  if (pathname.startsWith("/ops/executive")) {
    const targetUrl = new URL(pathname.replace("/ops/executive", "/ceo"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Check if current route is protected for customers or operational roles
  const isProtectedCustomer = PROTECTED_CUSTOMER_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isProtectedOperational = OPERATIONAL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if ((isProtectedCustomer || isProtectedOperational) && isGuest) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/orders/:path*",
    "/bookings/:path*",
    "/profile/:path*",
    "/inbox/:path*",
    "/returns/:path*",
    "/warranties/:path*",
    "/complaints/:path*",
    "/favorites/:path*",
    "/history/:path*",
    "/checkout/:path*",
    "/payments/:path*",
    "/provider/:path*",
    "/worker/:path*",
    "/merchant/:path*",
    "/supplier/:path*",
    "/admin/:path*",
    "/staff/:path*",
    "/ops/:path*",
    "/support/:path*",
    "/finance/:path*",
    "/business/:path*",
    "/ceo/:path*",
    "/executive/:path*",
    "/auth/login",
    "/login",
    "/auth/register",
    "/register",
  ],
};
