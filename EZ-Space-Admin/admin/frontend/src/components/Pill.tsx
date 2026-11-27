'use client';

import { COLORS } from '@/lib/constants';

const TONE_CLASSES: Record<string, string> = {
  ok: 'bg-green-100 text-green-600',
  warn: 'bg-amber-100 text-amber-700',
  bad: 'bg-red-100 text-red-600',
  brand: 'bg-brand-tint text-brand',
  muted: 'bg-slate-100 text-slate-600'
};

interface PillProps {
  tone: string;
  label?: string;
}

export function Pill({ tone, label }: PillProps) {
  const colorKey = COLORS[tone] || 'muted';
  const toneClass = TONE_CLASSES[colorKey] || TONE_CLASSES.muted;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[7px] px-[9px] py-1 text-[11px] font-bold ${toneClass}`}
    >
      {label ?? tone}
    </span>
  );
}
