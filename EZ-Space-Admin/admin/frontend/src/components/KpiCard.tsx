'use client';

import React from 'react';
import { Icon } from './Icon';

interface KpiCardProps {
  label: string;
  value: string;
  icon?: string;
  sub?: React.ReactNode;
}

export function KpiCard({ label, value, icon = 'analytics', sub }: KpiCardProps) {
  return (
    <div className="relative min-h-[146px] rounded-[14px] border border-slate-200 bg-white px-6 pb-5 pt-[22px] shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-600">
        <span>{label}</span>
        <div className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-[11px] bg-brand-tint text-brand">
          <Icon name={icon} sizeClass="h-[23px] w-[23px]" />
        </div>
      </div>
      <div className="mt-3 break-words text-[clamp(22px,2vw,29px)] font-extrabold leading-[1.3] tracking-[-0.03em] text-slate-900">
        {value}
      </div>
      <div className="mt-1.5 text-[11.5px] font-medium leading-[1.55] text-slate-500">
        {sub}
      </div>
    </div>
  );
}
