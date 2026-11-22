'use client';

import React from 'react';
import { Icon } from './Icon';

export function LoadingCard() {
  return (
    <section className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-[26px] py-9 text-slate-500 shadow-card">
      <Icon name="sync" className="animate-spin" /> Đang tải dữ liệu hệ thống...
    </section>
  );
}

export function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-[26px] py-9 text-slate-500 shadow-card">
      <Icon name="error" className="text-red-600" />
      <div className="flex-1">
        <b className="text-slate-900">Chưa thể tải dữ liệu trang này.</b>
        <p className="mt-0.5 text-[13px]">{message}</p>
      </div>
      <button type="button" className="btn btn-sm" onClick={onRetry}>
        Thử lại
      </button>
    </section>
  );
}
