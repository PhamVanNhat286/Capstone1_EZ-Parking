"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useStore } from "@/store";
import { clearAuthCookies, hasAuthTokenCookie, setAuthCookies } from "@/lib/authCookies";

const PUBLIC_PATHS = ["/dang-nhap"];
const ADMIN_PATHS = ["/admin"];
const OPEN_PATHS = ["/chinh-sach"];
const IGNORED_FROM_PATHS = ["/", "/kham-pha", "/ho-so", "/dang-nhap", "/chinh-sach"];

function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
function isOpenPath(path: string) {
  return OPEN_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
function isAdminPath(path: string) {
  return ADMIN_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

/**
 * Inner guard — dùng useSearchParams nên cần Suspense bên ngoài.
 * Chờ Zustand persist hydrate xong rồi mới redirect để tránh redirect sai
 * khi user vẫn còn trong localStorage nhưng Zustand chưa load xong.
 */
function AuthGuardInner({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);

  // Đợi Zustand persist rehydrate từ localStorage
  useEffect(() => {
    // useStore.persist.hasHydrated() đồng bộ sau khi hydrate
    const unsub = useStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // Nếu đã hydrate rồi thì set luôn
    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const isAdmin = user?.role === "admin" || user?.role === "owner";

    if (!user && !isPublicPath(pathname) && !isOpenPath(pathname)) {
      clearAuthCookies();
      try {
        localStorage.removeItem("ezspace_token");
      } catch {}
      const shouldSaveFrom = !IGNORED_FROM_PATHS.includes(pathname);
      const from = shouldSaveFrom ? `?from=${encodeURIComponent(pathname)}` : "";
      router.replace(`/dang-nhap${from}`);
    } else if (user && isPublicPath(pathname)) {
      if (!hasAuthTokenCookie()) {
        const storedToken = (() => {
          try {
            return localStorage.getItem("ezspace_token") || "";
          } catch {
            return "";
          }
        })();
        setAuthCookies(user.token || storedToken || "ezspace-session", user.role || "customer");
      }
      const fromParam = searchParams?.get("from");
      const isSafeFrom =
        Boolean(fromParam) &&
        fromParam!.startsWith("/") &&
        !fromParam!.startsWith("//") &&
        !IGNORED_FROM_PATHS.includes(fromParam!);
      const destination = isSafeFrom ? fromParam! : isAdmin ? "/admin" : "/kham-pha";
      router.replace(destination);
    } else if (user && !isAdmin && isAdminPath(pathname)) {
      router.replace("/kham-pha");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, pathname]);

  const isAdmin = user?.role === "admin" || user?.role === "owner";
  const isProtectedRoute = !isPublicPath(pathname) && !isOpenPath(pathname);
  const shouldHideChildren =
    (isProtectedRoute && (!hydrated || !user || (isAdminPath(pathname) && !isAdmin))) ||
    (hydrated && Boolean(user) && isPublicPath(pathname));

  if (shouldHideChildren) {
    return (
      <div className="w-full max-w-[430px] h-screen bg-white shadow-xl flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-xs font-semibold">Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}
