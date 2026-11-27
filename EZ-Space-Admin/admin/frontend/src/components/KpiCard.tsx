'use client';

import type { ReactNode } from 'react';
import { Icon } from './Icon';

type KpiTone = 'brand' | 'ok' | 'warn' | 'bad';

const TONE_CLASSES: Record<KpiTone, string> = {
  brand: 'bg-brand-tint text-brand',
  ok: 'bg-green-100 text-green-600',
  warn: 'bg-amber-100 text-amber-700',
  bad: 'bg-red-100 text-red-600'
};

interface KpiCardProps {
  label: string;
  value: string;
  icon?: string;
  tone?: KpiTone;
  sub?: ReactNode;
}

export function KpiCard({ label, value, icon = 'analytics', tone = 'brand', sub }: KpiCardProps) {
  return (
    <div className="relative min-h-[140px] rounded-[14px] border border-slate-200 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}
        >
          <Icon name={icon} sizeClass="h-[22px] w-[22px]" />
        </div>
      </div>
      <div className="mt-2.5 break-words text-[clamp(22px,1.9vw,27px)] font-extrabold leading-tight tracking-[-0.025em] text-slate-900">
        {value}
      </div>
      {sub ? (
        <div className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">{sub}</div>
      ) : null}
    </div>
  );
}
