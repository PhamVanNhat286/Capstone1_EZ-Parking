'use client';

import React from 'react';
import { Icon } from './Icon';

interface FilterToolbarProps {
  tabs: Array<[string, string]>;
  activeTab: string;
  onTabChange: (key: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  onExport?: () => void;
  exportLabel?: string;
}

export function FilterToolbar({
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onExport,
  exportLabel = 'Xuất CSV'
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-slate-200 bg-slate-50/60 px-6 py-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map(([key, label]) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-brand-tint hover:text-brand'
              }`}
              onClick={() => onTabChange(key)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex items-center">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            sizeClass="h-4 w-4"
          />
          <input
            className="h-9 min-w-[240px] rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15"
            id="list-search"
            aria-label="Tìm kiếm"
            placeholder="Tìm theo tên, mã hoặc thông tin..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
          {search ? (
            <button
              type="button"
              aria-label="Xóa từ khóa"
              onClick={() => onSearchChange('')}
              className="absolute right-2 rounded-md p-0.5 text-slate-400 hover:text-slate-700"
            >
              <Icon name="close" sizeClass="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {onExport ? (
          <button type="button" className="btn btn-sm h-9" onClick={onExport}>
            <Icon name="download" sizeClass="h-4 w-4" />
            <span>{exportLabel}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
