'use client';

import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';

interface LoginApiResponse {
  ok: boolean;
  role: 'admin' | 'manager';
  token?: string;
  user?: string;
  email?: string;
  csrf?: string;
}

interface AdminSignInProps {
  onAdminSuccess: (name: string, email: string, csrf?: string) => void;
  initialMessage?: string;
}

const PARTNER_ORIGIN =
  process.env.NEXT_PUBLIC_PARTNER_ORIGIN || 'http://localhost:3001';

export function AdminSignIn({ onAdminSuccess, initialMessage = '' }: AdminSignInProps) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(ev.currentTarget);
    const email = String(form.get('account') ?? '').trim();
    const password = String(form.get('password') ?? '');
    try {
      const res = await api<LoginApiResponse>('login', 'POST', { email, password });
      if (res.role === 'manager' && res.token) {
        window.location.href = `${PARTNER_ORIGIN}?token=${encodeURIComponent(res.token)}`;
        return;
      }
      onAdminSuccess(res.user || '', res.email || '', res.csrf);
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập.');
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,#dbeafe,#f6f9fe_70%)] px-4 py-7 text-[#172f50]">
      <section className="w-full max-w-[440px] rounded-[20px] border border-[#e0e9f6] bg-white p-6 shadow-[0_20px_70px_#17478b0d] sm:p-8">
        <div className="mb-8 flex items-center gap-[11px]">
          <span className="grid h-[43px] w-[43px] place-items-center rounded-xl bg-[#2563eb] text-[27px] font-extrabold text-white">
            P
          </span>
          <div>
            <b className="text-[21px] font-extrabold">EZ-Space</b>
            <small className="mt-0.5 block text-[9px] font-bold tracking-[1px] text-[#2563eb]">
              ADMIN &amp; PARTNER PORTAL
            </small>
          </div>
        </div>
        <div className="mb-4 grid h-[50px] w-[50px] place-items-center rounded-[14px] bg-[#eff6ff] text-[#2563eb]">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="16" r="1" />
            <rect x="3" y="10" width="18" height="12" rx="2" />
            <path d="M7 10V7a5 5 0 0 1 10 0v3" />
          </svg>
        </div>
        <h1 className="text-[21px] font-extrabold tracking-[-0.5px] sm:text-[23px]">
          Đăng nhập Quản trị &amp; Đối tác
        </h1>
        <p className="mb-6 mt-2.5 text-xs leading-[1.8] text-slate-500">
          Hệ thống tự động nhận diện tài khoản Quản trị viên (Admin) hoặc Quản lý bãi xe (Partner).
        </p>
        <form onSubmit={ev => void handleSubmit(ev)} className="grid gap-[17px]">
          <label className="grid gap-2 text-xs font-semibold text-[#53627b]">
            Email hoặc số điện thoại
            <input
              name="account"
              autoComplete="username"
              required
              placeholder="Email / số điện thoại của bạn"
              className="w-full rounded-[9px] border border-[#d4dfed] bg-white p-3 text-[13px] text-[#172f50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd]"
            />
          </label>
          <label className="grid gap-2 text-xs font-semibold text-[#53627b]">
            Mật khẩu
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Nhập mật khẩu"
              className="w-full rounded-[9px] border border-[#d4dfed] bg-white p-3 text-[13px] text-[#172f50] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#93c5fd]"
            />
          </label>
          {error || initialMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-[#fecdd3] bg-[#fff1f2] p-3 text-xs leading-[1.7] text-[#b91c1c]"
            >
              {error || initialMessage}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="flex min-h-[44px] items-center justify-center gap-[9px] rounded-[9px] bg-[#2563eb] text-[13px] font-bold text-white disabled:opacity-60"
          >
            <span>{busy ? 'Đang đăng nhập…' : 'Đăng nhập hệ thống'}</span>
          </button>
        </form>
        <footer className="mt-[22px] text-center text-[10px] leading-[1.8] text-slate-400">
          Tự động chuyển hướng vào không gian làm việc tương ứng với vai trò tài khoản của bạn.
        </footer>
      </section>
    </main>
  );
}

