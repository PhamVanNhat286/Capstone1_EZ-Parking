import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy (Next.js 16) kiểm tra trạng thái đăng nhập ở tầng server/edge dựa trên cookie `ezspace_token`.
 * - Trang gốc `/`: có token → `/kham-pha`, chưa có token → `/dang-nhap`
 * - Các trang công khai (`/dang-nhap`, `/chinh-sach`): cho qua
 * - Các trang yêu cầu đăng nhập (bao gồm `/kham-pha`): chưa có token → redirect thẳng `/dang-nhap`
 * - `/admin`: nếu có cookie `ezspace_role` và không phải admin/owner → redirect `/kham-pha`
 */

const PUBLIC_ROUTES = ["/dang-nhap"];
const OPEN_ROUTES = ["/chinh-sach"];
const ADMIN_ROUTES = ["/admin"];
const IGNORED_FROM_PATHS = ["/", "/kham-pha", "/ho-so", "/dang-nhap", "/chinh-sach"];

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Bỏ qua static files và API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname === "/icon.svg" ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|js|css|map)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("ezspace_token")?.value?.trim();
  const role = request.cookies.get("ezspace_role")?.value?.trim();

  // Trang gốc /: chưa đăng nhập thì vào thẳng /dang-nhap, đã có token thì vào /kham-pha
  if (pathname === "/") {
    return NextResponse.redirect(new URL(token ? "/kham-pha" : "/dang-nhap", request.url));
  }

  // Cho phép truy cập trang đăng nhập và các trang mở công khai
  if (matchesRoute(pathname, PUBLIC_ROUTES) || matchesRoute(pathname, OPEN_ROUTES)) {
    return NextResponse.next();
  }

  // Chặn ngay từ server nếu chưa đăng nhập (tránh SSR/flash giao diện /kham-pha)
  if (!token) {
    const loginUrl = new URL("/dang-nhap", request.url);
    if (!IGNORED_FROM_PATHS.includes(pathname)) {
      loginUrl.searchParams.set("from", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Bảo vệ /admin nếu có cookie role không hợp lệ
  if (matchesRoute(pathname, ADMIN_ROUTES)) {
    if (role && role !== "admin" && role !== "owner") {
      return NextResponse.redirect(new URL("/kham-pha", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
