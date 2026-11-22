'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  draftToRangeParams,
  isRangeDirty,
  RangeApiParams,
  RangeDraft,
  RangeMode
} from '@/lib/date-range';
import { formatVnDateShort } from '@/lib/format';
import { DateRangeDisplay } from '@/lib/types';

interface SelectOption {
  value: string;
  label: string;
}

const MODE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: '7 ngày gần đây' },
  { value: 'month', label: 'Tháng này' },
  { value: 'calendar-month', label: 'Theo tháng' },
  { value: 'year', label: 'Theo năm' },
  { value: 'custom', label: 'Khoảng ngày' }
];

const MONTH_OPTIONS: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`
}));

interface CustomSelectProps {
  id: string;
  name: string;
  value: string;
  options: SelectOption[];
  widthClass: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (val: string) => void;
}

function CustomSelect({
  id,
  name,
  value,
  options,
  widthClass,
  isOpen,
  onToggle,
  onSelect
}: CustomSelectProps) {
  const current = options.find(o => o.value === String(value)) || options[0];

  return (
    <div className="relative" data-range-select={name}>
      <input type="hidden" name={name} value={current.value} />
      <button
        type="button"
        id={id}
        className={`inline-flex h-[38px] min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[10px] border bg-white px-3 py-1.5 text-left text-[13px] font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-slate-50 focus-visible:border-brand focus-visible:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15 max-sm:w-full ${widthClass} ${
          isOpen ? 'border-brand bg-white ring-[3px] ring-brand/15' : 'border-slate-300'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="truncate">{current.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-brand' : 'text-slate-500'
          }`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5.5 7.75L10 12.25L14.5 7.75"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-[60] flex max-h-[280px] min-w-full flex-col gap-0.5 overflow-y-auto rounded-xl border border-blue-200 bg-white p-1.5 shadow-[0_12px_28px_-4px_rgba(15,23,42,0.14),0_4px_10px_-2px_rgba(37,99,235,0.08)]"
          role="listbox"
          aria-labelledby={id}
        >
          {options.map(opt => {
            const selected = opt.value === current.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`flex w-full items-center justify-between gap-2.5 whitespace-nowrap rounded-lg px-[11px] py-2 text-left text-[13px] transition-colors ${
                  selected
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 font-bold text-white shadow-[0_2px_6px_rgba(37,99,235,0.22)] hover:from-blue-700 hover:to-blue-800'
                    : 'font-medium text-slate-600 hover:bg-brand-tint hover:text-brand'
                }`}
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(opt.value)}
              >
                <span>{opt.label}</span>
                {selected ? (
                  <svg
                    className="h-[15px] w-[15px] shrink-0"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M16.25 5.625L8.125 13.75L3.75 9.375"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface RangeFilterProps {
  draft: RangeDraft;
  onDraftChange: (next: RangeDraft) => void;
  appliedMode: RangeMode;
  appliedParams: RangeApiParams;
  activeRange?: DateRangeDisplay;
  loading: boolean;
  onApply: (params: RangeApiParams, mode: RangeMode, snapshot: string) => void;
  onValidationError: (msg: string) => void;
}

const inputBaseClass =
  'h-[38px] min-w-0 rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-900 transition hover:border-blue-300 hover:bg-slate-50 focus-visible:border-brand focus-visible:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15 max-sm:w-full';

export function RangeFilter({
  draft,
  onDraftChange,
  appliedMode,
  appliedParams,
  activeRange,
  loading,
  onApply,
  onValidationError
}: RangeFilterProps) {
  const [openMenu, setOpenMenu] = useState<'mode' | 'month' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(ev: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpenMenu(null);
      }
    }
    function handleKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const dirty = isRangeDirty(draft, appliedMode, appliedParams);
  const caption =
    appliedParams.range === 'all'
      ? 'Đang xem: Tất cả thời gian'
      : activeRange
      ? `Đang xem: ${formatVnDateShort(activeRange.from)} – ${formatVnDateShort(activeRange.to)}`
      : '';

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setOpenMenu(null);
    try {
      const params = draftToRangeParams(draft);
      onApply(params, draft.mode, JSON.stringify(draft));
    } catch (err) {
      onValidationError(err instanceof Error ? err.message : 'Khoảng thời gian không hợp lệ.');
    }
  }

  return (
    <div
      className="my-1 rounded-xl border border-slate-200 bg-white p-4 max-sm:p-3.5"
      id="range-controls"
      data-range-controls
      ref={containerRef}
    >
      <form
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4"
        aria-label="Lọc thời gian thống kê"
        onSubmit={handleSubmit}
      >
        <div className="flex min-w-0 flex-wrap items-end gap-3 max-sm:w-full">
          <div className="grid min-w-0 gap-1.5 max-sm:basis-full">
            <label htmlFor="range-mode" className="text-xs font-bold text-slate-600">
              Thời gian
            </label>
            <CustomSelect
              id="range-mode"
              name="mode"
              value={draft.mode}
              options={MODE_OPTIONS}
              widthClass="w-[184px]"
              isOpen={openMenu === 'mode'}
              onToggle={() => setOpenMenu(prev => (prev === 'mode' ? null : 'mode'))}
              onSelect={val => {
                onDraftChange({ ...draft, mode: val as RangeMode });
                setOpenMenu(null);
              }}
            />
          </div>

          {draft.mode === 'calendar-month' ? (
            <div className="grid min-w-0 gap-1.5 max-sm:flex-1">
              <label htmlFor="range-month" className="text-xs font-bold text-slate-600">
                Tháng
              </label>
              <CustomSelect
                id="range-month"
                name="month"
                value={draft.month}
                options={MONTH_OPTIONS}
                widthClass="w-[136px]"
                isOpen={openMenu === 'month'}
                onToggle={() => setOpenMenu(prev => (prev === 'month' ? null : 'month'))}
                onSelect={val => {
                  onDraftChange({ ...draft, month: val });
                  setOpenMenu(null);
                }}
              />
            </div>
          ) : null}

          {draft.mode === 'year' || draft.mode === 'calendar-month' ? (
            <div className="grid min-w-0 gap-1.5 max-sm:flex-1">
              <label htmlFor="range-year" className="text-xs font-bold text-slate-600">
                Năm
              </label>
              <input
                id="range-year"
                name="year"
                type="number"
                min={2000}
                max={9999}
                step={1}
                className={`${inputBaseClass} w-[104px]`}
                value={draft.year}
                onChange={e => onDraftChange({ ...draft, year: e.target.value })}
                required
              />
            </div>
          ) : null}

          {draft.mode === 'custom' ? (
            <>
              <div className="grid min-w-0 gap-1.5 max-sm:flex-1">
                <label htmlFor="range-from" className="text-xs font-bold text-slate-600">
                  Từ ngày
                </label>
                <input
                  id="range-from"
                  name="from"
                  type="date"
                  className={`${inputBaseClass} w-[140px]`}
                  value={draft.from}
                  onChange={e => onDraftChange({ ...draft, from: e.target.value })}
                  required
                />
              </div>
              <div className="grid min-w-0 gap-1.5 max-sm:flex-1">
                <label htmlFor="range-to" className="text-xs font-bold text-slate-600">
                  Đến ngày
                </label>
                <input
                  id="range-to"
                  name="to"
                  type="date"
                  className={`${inputBaseClass} w-[140px]`}
                  value={draft.to}
                  onChange={e => onDraftChange({ ...draft, to: e.target.value })}
                  required
                />
              </div>
            </>
          ) : null}

          <button
            type="submit"
            className="btn btn-sm btn-primary min-h-[38px] rounded-[10px] px-[18px]"
            data-apply-range
            disabled={loading}
          >
            {loading ? 'Đang tải…' : 'Áp dụng'}
          </button>
        </div>

        <div className="grid gap-1.5 text-right max-sm:justify-items-start max-sm:text-left" aria-live="polite">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-brand-tint px-[11px] py-[5px] text-xs font-semibold text-brand">
            {caption}
          </span>
          {dirty ? (
            <span className="text-[11px] font-semibold text-amber-700">
              Thay đổi chưa áp dụng
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
