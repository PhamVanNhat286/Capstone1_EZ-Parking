"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on certain pages
  if (
    pathname.startsWith("/dang-nhap") ||
    pathname.startsWith("/dat-cho") ||
    pathname.startsWith("/ve") ||
    pathname.startsWith("/thanh-toan") ||
    pathname.startsWith("/chi-duong") ||
    pathname.startsWith("/xe-cua-toi") ||
    pathname.startsWith("/bai/")
  ) {
    return null;
  }

  const isExplore = pathname === "/";
  const isTickets = pathname.startsWith("/lich-su");
  const isAi = pathname.startsWith("/ai");
  const isProfile = pathname.startsWith("/ho-so");

  return (
    <nav className="w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/90 rounded-t-[20px] px-2 pt-2.5 pb-3 shadow-[0_-4px_18px_rgba(0,0,0,0.04)] shrink-0 z-40">
      <div className="grid grid-cols-4 items-center">
        {/* Tab 1: Khám phá */}
        <Link
          href="/"
          className={clsx(
            "flex flex-col items-center justify-center gap-1 transition active:scale-95",
            isExplore ? "text-[#2563EB]" : "text-[#64748B] hover:text-slate-700"
          )}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={isExplore ? "currentColor" : "none"} />
            </svg>
          </div>
          <span className={clsx("text-[11px] tracking-tight", isExplore ? "font-extrabold text-[#2563EB]" : "font-medium text-[#64748B]")}>
            Khám phá
          </span>
        </Link>

        {/* Tab 2: Vé và lịch sử */}
        <Link
          href="/lich-su"
          className={clsx(
            "flex flex-col items-center justify-center gap-1 transition active:scale-95",
            isTickets ? "text-[#2563EB]" : "text-[#64748B] hover:text-slate-700"
          )}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
              <path d="M14 8H10.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H10" />
              <path d="M12 6v12" />
            </svg>
          </div>
          <span className={clsx("text-[11px] tracking-tight", isTickets ? "font-extrabold text-[#2563EB]" : "font-medium text-[#64748B]")}>
            Vé & Lịch sử
          </span>
        </Link>

        {/* Tab 3: AI */}
        <Link
          href="/ai"
          className={clsx(
            "flex flex-col items-center justify-center gap-1 transition active:scale-95",
            isAi ? "text-[#2563EB]" : "text-[#64748B] hover:text-slate-700"
          )}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3C12 7.5 15.5 11 20 11C15.5 11 12 14.5 12 19C12 14.5 8.5 11 4 11C8.5 11 12 7.5 12 3Z" fill={isAi ? "currentColor" : "none"} />
              <path d="M19 3v4" />
              <path d="M17 5h4" />
              <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <span className={clsx("text-[11px] tracking-tight", isAi ? "font-extrabold text-[#2563EB]" : "font-medium text-[#64748B]")}>
            AI
          </span>
        </Link>

        {/* Tab 4: Hồ sơ */}
        <Link
          href="/ho-so"
          className={clsx(
            "flex flex-col items-center justify-center gap-1 transition active:scale-95",
            isProfile ? "text-[#2563EB]" : "text-[#64748B] hover:text-slate-700"
          )}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="7" r="4" fill={isProfile ? "currentColor" : "none"} />
              <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
            </svg>
          </div>
          <span className={clsx("text-[11px] tracking-tight", isProfile ? "font-extrabold text-[#2563EB]" : "font-medium text-[#64748B]")}>
            Hồ sơ
          </span>
        </Link>
      </div>

      {/* Native Home Indicator bar */}
      <div className="w-full flex justify-center items-center pt-2">
        <div className="w-28 h-1 rounded-full bg-slate-200" />
      </div>
    </nav>
  );
}
