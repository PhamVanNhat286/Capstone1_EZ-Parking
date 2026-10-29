import { NextRequest, NextResponse } from "next/server";

/**
 * NOTE: Auth chính được xử lý bởi AuthGuard (client-side, đọc Zustand/localStorage).
 * Middleware này chỉ xử lý các trường hợp cần Edge-level check:
 *   - Bảo vệ /admin: nếu có cookie ezspace_role và không phải admin → redirect /
 *   - Mọi route khác: cho qua, AuthGuard sẽ handle
 */

const ADMIN_ROUTES = ["/admin"];

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bỏ qua static files và API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|js|css|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Chỉ kiểm tra /admin nếu có cookie role
  // (cookie được set bởi login page sau khi auth thành công)
  if (isAdminRoute(pathname)) {
    const role = request.cookies.get("ezspace_role")?.value;
    // Nếu có cookie và không phải admin → chặn
    if (role && role !== "admin" && role !== "owner") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    // Không có cookie → để AuthGuard client-side xử lý
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
