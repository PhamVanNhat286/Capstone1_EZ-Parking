"use client";

import { useState } from 'react';
import { LockKeyhole, LogIn } from 'lucide-react';
import { partnerRequest } from '@/lib/partner-api';
import styles from './sql-auth.module.css';

export default function PartnerSignIn({ onLogin, message }: { onLogin: (token: string) => void; message: string }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <main className={styles.page}><section className={styles.card}>
    <div className={styles.brand}><span>P</span><div><b>EZ-Space</b><small>PARTNER PORTAL</small></div></div>
    <div className={styles.icon}><LockKeyhole size={26} /></div>
    <h1>Đăng nhập quản lý bãi</h1><p>Quản lý bãi đỗ, vị trí còn trống và doanh thu từ dữ liệu của hệ thống.</p>
    <form onSubmit={async event => {
      event.preventDefault(); setError(''); setBusy(true);
      const form = new FormData(event.currentTarget);
      try {
        const data = await partnerRequest<{ token: string; user: { role: string } }>('/auth/login', null, 'POST', { email: String(form.get('account') ?? '').trim(), password: String(form.get('password') ?? '') });
        if (data.user.role !== 'manager') throw new Error('Vui lòng sử dụng tài khoản quản lý bãi (manager).');
        onLogin(data.token);
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập.'); }
      finally { setBusy(false); }
    }}>
      <label>Email hoặc số điện thoại<input name="account" autoComplete="username" required placeholder="Email / số điện thoại của bạn" /></label>
      <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required placeholder="Nhập mật khẩu" /></label>
      {(error || message) && <p className={styles.error} role="alert">{error || message}</p>}
      <button type="submit" disabled={busy}><LogIn size={17} />{busy ? 'Đang đăng nhập…' : 'Đăng nhập Partner'}</button>
    </form><footer>Chỉ hiển thị các bãi được phân công cho tài khoản của bạn.</footer>
  </section></main>;
}
