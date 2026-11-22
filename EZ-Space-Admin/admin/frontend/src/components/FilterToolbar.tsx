'use client';

import React from 'react';

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
    <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-slate-100 px-6 py-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn btn-sm ${activeTab === key ? 'btn-primary' : ''}`}
            onClick={() => onTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[240px] rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 focus:border-blue-400 focus:outline focus:outline-2 focus:outline-blue-200"
          id="list-search"
          aria-label="Tìm kiếm"
          placeholder="Tìm theo tên, mã hoặc thông tin..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        {onExport ? (
          <button type="button" className="btn btn-sm" onClick={onExport}>
            {exportLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
