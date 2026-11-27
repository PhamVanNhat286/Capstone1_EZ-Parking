'use client';

import type { ReactNode } from 'react';
import { Icon } from './Icon';

type SectionIconTone = 'brand' | 'warn';

const ICON_TONE_CLASSES: Record<SectionIconTone, string> = {
  brand: 'bg-brand-tint text-brand',
  warn: 'bg-amber-100 text-amber-700'
};

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: string;
  iconTone?: SectionIconTone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  subtitle,
  icon,
  iconTone = 'brand',
  action,
  className = '',
  children
}: SectionCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-card ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ICON_TONE_CLASSES[iconTone]}`}
            >
              <Icon name={icon} sizeClass="h-[20px] w-[20px]" />
            </div>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-[17px] font-extrabold leading-snug text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
