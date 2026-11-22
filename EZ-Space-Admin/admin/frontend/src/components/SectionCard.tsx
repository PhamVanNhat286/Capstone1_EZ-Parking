'use client';

import React from 'react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, subtitle, className = '', children }: SectionCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-btn ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 pb-4 pt-[22px]">
        <div>
          <h2 className="text-[17px] font-extrabold leading-normal text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}
