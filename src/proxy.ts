import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_CUSTOMER_ROUTES = [
  "/orders",
  "/bookings",
  "/profile",
  "/security",
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

  // Izinkan akses langsung ke /auth/login dan /login tanpa auto-redirect paksa


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

  // Modul 01 Aliases: /customer/profile -> /profile, /customer/security -> /security
  if (pathname.startsWith("/customer/profile")) {
    const targetUrl = new URL(pathname.replace("/customer/profile", "/profile"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  if (pathname.startsWith("/customer/security")) {
    const targetUrl = new URL(pathname.replace("/customer/security", "/security"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Modul 01 Aliases: /ceo/staff -> /ceo/internal-team
  if (pathname === "/ceo/staff" || pathname.startsWith("/ceo/staff/")) {
    const targetUrl = new URL(pathname.replace("/ceo/staff", "/ceo/internal-team"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Modul 01 Aliases: /admin/applications -> /admin/registration-applications
  if (pathname === "/admin/applications" || pathname.startsWith("/admin/applications/")) {
    const targetUrl = new URL(pathname.replace("/admin/applications", "/admin/registration-applications"), request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl);
  }

  // Modul 01 Aliases: /register/business -> /auth/register
  if (pathname === "/register/business") {
    const targetUrl = new URL("/auth/register?role=business", request.url);
    return NextResponse.rewrite(targetUrl);
  }

  // Modul 01 Aliases: /application/:id -> /registration/status
  if (pathname.startsWith("/application/")) {
    const parts = pathname.split("/").filter(Boolean);
    const appId = parts[1] || "";
    const targetUrl = new URL("/registration/status", request.url);
    if (appId && appId !== "status" && appId !== "revision") {
      targetUrl.searchParams.set("id", appId);
    }
    return NextResponse.rewrite(targetUrl);
  }

  // Modul 01 Aliases: /provider/workers/invite -> /provider/workers
  if (pathname === "/provider/workers/invite") {
    const targetUrl = new URL("/provider/workers", request.url);
    return NextResponse.rewrite(targetUrl);
  }

  // Check if current route is protected for customers or operational roles
  const isProtectedCustomer = PROTECTED_CUSTOMER_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  const isProtectedOperational =
    OPERATIONAL_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    ) && !pathname.startsWith("/worker/activate");

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
    "/security/:path*",
    "/customer/:path*",
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
