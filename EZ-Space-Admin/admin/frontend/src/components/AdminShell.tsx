'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAdmin } from '@/context/AdminContext';
import { n } from '@/lib/format';
import { Icon } from './Icon';

interface NavMeta {
  href: string;
  label: string;
  icon: string;
  crumb: string;
  heading: string;
  subtitle: string;
  hasPendingBadge?: boolean;
}

const NAV_ITEMS: NavMeta[] = [
  {
    href: '/',
    label: 'Tổng quan nền tảng',
    icon: 'dashboard',
    crumb: 'Tổng quan nền tảng',
    heading: 'Tổng quan nền tảng (Platform Overview)',
    subtitle:
      'Giám sát hoạt động vận hành, lưu lượng đặt chỗ, tình trạng ô đỗ và phê duyệt đối tác bãi xe trên toàn hệ thống.'
  },
  {
    href: '/lots',
    label: 'Quản lý bãi đỗ',
    icon: 'apartment',
    crumb: 'Quản lý & Phê duyệt bãi đỗ',
    heading: 'Quản lý & Phê duyệt bãi đỗ (Lot Operations)',
    subtitle:
      'Kiểm duyệt bãi đỗ mới đăng ký, theo dõi sơ đồ ô đỗ 2D và quản lý trạng thái vận hành trên toàn hệ thống.',
    hasPendingBadge: true
  },
  {
    href: '/users',
    label: 'Quản lý người dùng',
    icon: 'group',
    crumb: 'Quản lý người dùng hệ thống',
    heading: 'Quản lý người dùng hệ thống (User Management)',
    subtitle:
      'Quản lý hồ sơ khách hàng, chủ bãi đỗ xe, phương tiện cá nhân và trạng thái hoạt động của tài khoản.'
  },
  {
    href: '/revenue',
    label: 'Báo cáo doanh thu',
    icon: 'account_balance_wallet',
    crumb: 'Báo cáo doanh thu tổng',
    heading: 'Báo cáo doanh thu Admin',
    subtitle:
      'Admin nhận 5% tiền thực thu của mỗi lượt đặt ô giữ xe sau hoàn tiền; chủ bãi nhận 95% còn lại.'
  },
  {
    href: '/logs',
    label: 'Nhật ký hệ thống',
    icon: 'history',
    crumb: 'Nhật ký hệ thống & Đối soát',
    heading: 'Nhật ký hệ thống & Đối soát (System Audit Logs)',
    subtitle:
      'Theo dõi lịch sử thao tác quản trị hệ thống, phê duyệt bãi đỗ và lịch sử vận hành của chủ bãi.'
  },
  {
    href: '/data',
    label: 'Dữ liệu nghiệp vụ',
    icon: 'database',
    crumb: 'Dữ liệu nghiệp vụ',
    heading: 'Dữ liệu nghiệp vụ (Operational Data)',
    subtitle:
      'Tra cứu chi tiết đơn đặt chỗ, phương tiện, ô đỗ 2D, thanh toán, vé QR, phiên đỗ xe, bảng giá, lịch sử Chat AI và OTP.'
  },
  {
    href: '/settings',
    label: 'Cài đặt nền tảng',
    icon: 'settings',
    crumb: 'Cài đặt nền tảng',
    heading: 'Cài đặt nền tảng (Platform Settings)',
    subtitle:
      'Tổng hợp quy tắc giữ chỗ, bảng giá theo khung giờ, phân quyền quản lý bãi xe và cấu hình phương tiện hỗ trợ.'
  }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const {
    adminName,
    adminEmail,
    summary,
    syncTime,
    refreshing,
    errorBanner,
    toast,
    modal,
    closeModal,
    triggerRefresh
  } = useAdmin();

  const current =
    NAV_ITEMS.find(item =>
      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    ) || NAV_ITEMS[0];

  useEffect(() => {
    document.title = `EZ-Space Admin — ${current.heading}`;
  }, [current.heading]);

  const pendingCount = n(summary?.lots?.pending);

  return (
    <>
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col justify-between border-r border-slate-200 bg-white shadow-[0_1px_5px_rgba(15,23,42,0.015)] lg:flex"
        aria-label="Điều hướng hệ thống"
      >
        <div className="flex-1 overflow-y-auto">
          <div className="flex h-[76px] items-center justify-between border-b border-slate-200 px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-xl font-extrabold text-white shadow-[0_3px_10px_rgba(37,99,235,0.18)]">
                P
              </div>
              <div>
                <b className="block text-[17px] font-extrabold leading-tight text-slate-900">
                  EZ-Space
                </b>
                <small className="text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400">
                  PLATFORM CORE
                </small>
              </div>
            </div>
            <span className="inline-flex h-6 items-center justify-center whitespace-nowrap rounded-[7px] border border-blue-200 bg-brand-tint px-[9px] text-[10px] font-bold text-brand">
              Admin
            </span>
          </div>

          <div className="px-6 pb-2.5 pt-[22px] text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
            Điều hướng hệ thống
          </div>

          <nav className="flex flex-col gap-[5px] px-3">
            {NAV_ITEMS.map(item => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex min-h-[42px] items-center gap-3 rounded-[11px] px-[13px] py-[11px] text-[13px] transition-colors ${
                    active
                      ? 'border border-blue-200/65 bg-brand-tint font-bold text-brand shadow-[0_1px_3px_rgba(37,99,235,0.035)] before:absolute before:bottom-[7px] before:left-0 before:top-[7px] before:w-1 before:rounded-r before:bg-brand before:content-[""]'
                      : 'font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    name={item.icon}
                    className={active ? 'text-brand' : 'text-slate-500'}
                  />
                  <span>{item.label}</span>
                  {item.hasPendingBadge && pendingCount > 0 ? (
                    <span
                      className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700"
                      data-pending-badge
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0">
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white">
                AD
              </div>
              <div className="min-w-0">
                <b id="admin-name" className="block truncate text-[13px] font-bold leading-tight">
                  {adminName}
                </b>
                <small id="admin-email" className="block truncate text-[11px] text-slate-500">
                  {adminEmail}
                </small>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen min-w-0 flex-col lg:ml-[260px]">
        <div className="flex min-h-[64px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-[clamp(18px,3vw,42px)] py-3.5 lg:h-[72px] lg:py-0">
          <div className="hidden items-center gap-[7px] whitespace-nowrap text-xs font-medium text-slate-500 sm:flex">
            <span>Admin Portal</span>
            <Icon name="chevron_right" sizeClass="h-3.5 w-3.5" />
            <b className="font-bold text-slate-900">{current.crumb}</b>
          </div>
          <div className="flex w-full items-center justify-between gap-3.5 sm:w-auto sm:justify-end">
            <span id="sync-time" className="text-xs font-medium text-slate-500">
              {syncTime}
            </span>
            <button
              className="btn"
              id="btn-refresh"
              type="button"
              disabled={refreshing}
              onClick={triggerRefresh}
            >
              <Icon name="refresh" sizeClass="h-[17px] w-[17px]" /> Làm mới
            </button>
          </div>
        </div>

        <nav className="mx-5 mt-2.5 flex gap-[7px] overflow-x-auto pb-3 lg:hidden">
          {NAV_ITEMS.map(item => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-[13px] font-semibold ${
                  active
                    ? 'border-blue-200 bg-brand-tint text-brand'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <Icon name={item.icon} sizeClass="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mx-auto w-full max-w-[1600px] px-[clamp(18px,3vw,42px)] pb-12 pt-5 lg:pt-7">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 pt-0.5">
            <div>
              <h1 className="text-[clamp(21px,1.65vw,26px)] font-extrabold leading-[1.4] tracking-[-0.03em] text-slate-900">
                {current.heading}
              </h1>
              <p className="mt-1.5 max-w-[840px] text-[13px] leading-[1.65] text-slate-500">
                {current.subtitle}
              </p>
            </div>
          </header>

          {errorBanner ? (
            <div
              id="error-banner"
              className="my-3 rounded-[10px] border border-rose-200 bg-rose-50 px-[18px] py-[13px] text-[13px] text-red-700"
              role="alert"
            >
              {errorBanner}
            </div>
          ) : null}

          <div id="live-root" className="flex flex-col gap-[22px] pb-8" aria-live="polite">
            {children}
          </div>
        </div>

        <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400 sm:px-9">
          EZ-Space Smart Parking · Hệ thống Quản trị Nền tảng (Admin Portal)
        </footer>
      </main>

      {modal.open ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/55 p-[18px] backdrop-blur-[2px]"
          id="detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={ev => {
            if (ev.target === ev.currentTarget) closeModal();
          }}
        >
          <div
            className={`max-h-[90vh] w-full overflow-auto rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.25)] ${
              modal.isDialog ? 'max-w-[480px] px-6 py-[22px]' : 'max-w-[990px] p-6'
            }`}
          >
            <div className="mb-4 flex items-center justify-between gap-3.5 border-b border-slate-200 pb-[15px]">
              <h2 id="modal-title" className="text-[19px] font-extrabold leading-[1.4] text-slate-900">
                {modal.title}
              </h2>
              <button
                id="modal-close"
                className="btn btn-sm"
                type="button"
                onClick={closeModal}
              >
                Đóng <Icon name="close" sizeClass="h-[17px] w-[17px]" />
              </button>
            </div>
            <div id="modal-content">{modal.content}</div>
          </div>
        </div>
      ) : null}

      <div
        className={`pointer-events-none fixed bottom-6 right-6 z-[10000] flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition duration-300 ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
        }`}
        id="toast"
        role="status"
      >
        <Icon
          name={toast.type === 'bad' ? 'error' : 'check_circle'}
          className={toast.type === 'bad' ? 'text-red-400' : 'text-green-400'}
        />
        <span id="toast-msg">{toast.message}</span>
      </div>
    </>
  );
}
