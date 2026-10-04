"use client";
import { Compass, Receipt, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { vi } from "@/lib/i18n/vi";

const navItems = [
  { href: "/", label: vi.nav.explore, icon: Compass },
  { href: "/lich-su", label: vi.nav.history, icon: Receipt },
  { href: "/ai", label: vi.nav.ai, icon: Sparkles },
  { href: "/ho-so", label: vi.nav.profile, icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on certain pages
  if (
    pathname.startsWith("/dang-nhap") ||
    pathname.startsWith("/dat-cho") ||
    pathname.startsWith("/ve") ||
    pathname.startsWith("/thanh-toan") ||
    pathname.startsWith("/xe-cua-toi") ||
    pathname.startsWith("/bai/")
  ) {
    return null;
  }

  return (
    <div className="w-full bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-around items-center pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] px-4 z-10 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] shrink-0">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center gap-1.5 min-w-[64px] transition-colors relative",
              isActive ? "text-[#2B4BD1]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <div className="relative">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "fill-[#2B4BD1]/10" : ""} />
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
