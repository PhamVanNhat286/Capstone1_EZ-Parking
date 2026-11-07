"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStore } from "@/store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const user = useStore((s) => s.user);
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user && pathname !== "/dang-nhap") {
      router.replace("/dang-nhap");
    } else if (user && pathname === "/dang-nhap") {
      router.replace("/");
    }
  }, [user, pathname, router, mounted]);

  if (!mounted) return null; // Prevent hydration mismatch

  // Avoid flashing protected content
  if (!user && pathname !== "/dang-nhap") return null;
  if (user && pathname === "/dang-nhap") return null;

  return <>{children}</>;
}
