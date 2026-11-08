"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useStore } from "@/store";

const PUBLIC_PATHS = ["/dang-nhap"];
const ADMIN_PATHS = ["/admin"];
const IGNORED_FROM_PATHS = ["/", "/kham-pha", "/ho-so", "/dang-nhap"];

function isPublicPath(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
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

    if (!user && !isPublicPath(pathname)) {

    const shouldSaveFrom = !IGNORED_FROM_PATHS.includes(pathname);
    const from = shouldSaveFrom ? `?from=${encodeURIComponent(pathname)}` : "";
      router.replace(`/dang-nhap${from}`);
    } else if (user && isPublicPath(pathname)) {
      const fromParam = searchParams?.get("from");
      const destination =
        fromParam && fromParam.startsWith("/") && !IGNORED_FROM_PATHS.includes(fromParam) ? fromParam : isAdmin ? "/admin" : "/kham-pha";
      router.replace(destination);
    } else if (user && !isAdmin && isAdminPath(pathname)) {
      router.replace("/kham-pha");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user, pathname]);

  // Trong lúc chờ hydrate: render children bình thường (tránh flash trắng)
  return <>{children}</>;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthGuardInner>{children}</AuthGuardInner>
    </Suspense>
  );
}
