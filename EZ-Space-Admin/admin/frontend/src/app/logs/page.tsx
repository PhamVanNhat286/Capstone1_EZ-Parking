'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { KpiCard } from '@/components/KpiCard';
import { LogDetailModal } from '@/components/LogDetailModal';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { useAdmin } from '@/context/AdminContext';
import { MANAGER_ACTION, ROLE } from '@/lib/constants';
import { downloadCsv, downloadJson } from '@/lib/csv';
import { dt, n, nf } from '@/lib/format';
import { LogRecord, LogsResponse } from '@/lib/types';
import { useAdminPageData } from '@/lib/useAdminPageData';

type LogSourceTab = 'common' | 'manager';

const COMMON_ACTIONS = [
  'APPROVE_LOT',
  'REJECT_LOT',
  'LOT_STATUS_CHANGED',
  'USER_STATUS_CHANGED',
  'UPDATE_SLOT',
  'HOLD_SPOT',
  'AUTO_CANCEL_HOLD_EXPIRED',
  'AUTO_FORFEIT_ARRIVAL_EXPIRED',
  'PLATFORM_SETTINGS_UPDATED',
  'CACHE_FLUSHED'
];

const MANAGER_ACTIONS = [
  'lot_created',
  'lot_updated',
  'slot_updated',
  'pricing_updated',
  'reservation_cancelled',
  'report_viewed'
];

const ACTION_BADGE_MAP: Record<string, string> = {
  APPROVE_LOT: 'bg-green-100 text-green-700',
  lot_created: 'bg-green-100 text-green-700',
  HOLD_SPOT: 'bg-brand-tint text-brand',
  UPDATE_SLOT: 'bg-brand-tint text-brand',
  slot_updated: 'bg-brand-tint text-brand',
  pricing_updated: 'bg-brand-tint text-brand',
  lot_updated: 'bg-brand-tint text-brand',
  report_viewed: 'bg-slate-100 text-slate-700',
  USER_STATUS_CHANGED: 'bg-amber-100 text-amber-800',
  LOT_STATUS_CHANGED: 'bg-amber-100 text-amber-800',
  AUTO_CANCEL_HOLD_EXPIRED: 'bg-amber-100 text-amber-800',
  AUTO_FORFEIT_ARRIVAL_EXPIRED: 'bg-red-100 text-red-700',
  REJECT_LOT: 'bg-red-100 text-red-700',
  reservation_cancelled: 'bg-red-100 text-red-700',
  PLATFORM_SETTINGS_UPDATED: 'bg-brand-tint text-brand',
  CACHE_FLUSHED: 'bg-amber-100 text-amber-800'
};

const ROLE_BADGE_MAP: Record<string, string> = {
  admin: 'bg-brand-tint text-brand',
  manager: 'bg-amber-100 text-amber-800',
  customer: 'bg-green-100 text-green-700'
};

function toVnDateKey(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  }
  return raw.slice(0, 10);
}

function buildDiffPreview(oldVal: unknown, newVal: unknown): string {
  const oldObj =
    oldVal && typeof oldVal === 'object' && !Array.isArray(oldVal)
      ? (oldVal as Record<string, unknown>)
      : null;
  const newObj =
    newVal && typeof newVal === 'object' && !Array.isArray(newVal)
      ? (newVal as Record<string, unknown>)
      : null;

  if (oldObj && newObj) {
    const changedKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).filter(
      k => JSON.stringify(oldObj[k]) !== JSON.stringify(newObj[k])
    );
    if (changedKeys.length > 0) {
      const k = changedKeys[0];
      return `${k}: ${String(oldObj[k] ?? 'null')} ➔ ${String(newObj[k] ?? 'null')}`;
    }
    return `Cập nhật ${Object.keys(newObj).length} trường`;
  }
  if (!oldObj && newObj) {
    const firstKey = Object.keys(newObj)[0];
    return firstKey ? `INSERT (${firstKey}: ${String(newObj[firstKey])})` : 'INSERT bản ghi mới';
  }
  if (oldObj && !newObj) {
    return `Xoá dữ liệu (${Object.keys(oldObj).length} trường)`;
  }
  return 'Không có payload diff';
}

function getPageNumbers(current: number, totalPages: number): Array<number | '...'> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | '...'> = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

export default function LogsPage() {
  const { notice, refreshing, triggerRefresh, openModal, summary } = useAdmin();
  const { data, loadError, reload } = useAdminPageData<LogsResponse>(
    'logs',
    'Không thể tải nhật ký hệ thống.'
  );
  const holdMinutes = summary?.platform_config?.hold_timeout_minutes ?? 10;
  const arrivalMinutes = summary?.platform_config?.arrival_timeout_minutes ?? 20;

  const [tab, setTab] = useState<LogSourceTab>('common');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenu, setOpenMenu] = useState<'export' | 'action' | 'pageSize' | null>(null);

  const exportRef = useRef<HTMLDivElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(ev: MouseEvent) {
      const target = ev.target as Node;
      const insideExport = exportRef.current?.contains(target);
      const insideAction = actionMenuRef.current?.contains(target);
      const insidePageSize = pageSizeMenuRef.current?.contains(target);
      if (!insideExport && !insideAction && !insidePageSize) {
        setOpenMenu(null);
      }
    }
    function handleKeyDown(ev: KeyboardEvent) {
      if (ev.key === 'Escape') setOpenMenu(null);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const { commonLogs, managerLogs, allLogs } = useMemo(() => {
    const baseList: LogRecord[] = (data?.items || []).map(x => ({
      ...x,
      id: n(x.id),
      source: 'admin',
      action: String(x.action || ''),
      category: String(x.action || ''),
      actor: x.actor ? String(x.actor) : null,
      actor_email: x.actor_email ? String(x.actor_email) : '',
      actor_role: x.actor_role ? String(x.actor_role) : '',
      entity_type: x.entity_type ? String(x.entity_type) : null,
      entity_id: x.entity_id ? n(x.entity_id) : null,
      lot_name: x.lot_name ? String(x.lot_name) : null,
      note: x.note ? String(x.note) : null,
      created_at: String(x.created_at || '')
    }));

    const mgrList: LogRecord[] = (data?.manager_history || []).map(x => ({
      ...x,
      id: n(x.id),
      source: 'manager',
      action: String(x.action_type || ''),
      category: String(x.action_type || ''),
      user_id: n(x.manager_id),
      actor: x.actor ? String(x.actor) : null,
      actor_email: x.actor_email ? String(x.actor_email) : '',
      actor_role: x.actor_role ? String(x.actor_role) : 'manager',
      entity_type: 'parking_lots',
      entity_id: n(x.parking_lot_id),
      lot_name: x.lot_name ? String(x.lot_name) : null,
      note: x.note ? String(x.note) : null,
      created_at: String(x.created_at || '')
    }));

    const sortDesc = (a: LogRecord, b: LogRecord) =>
      String(b.created_at).localeCompare(String(a.created_at)) || n(b.id) - n(a.id);

    const sortedCommon = [...baseList].sort(sortDesc);
    const sortedManager = [...mgrList].sort(sortDesc);

    return {
      commonLogs: sortedCommon,
      managerLogs: sortedManager,
      allLogs: [...sortedCommon, ...sortedManager].sort(sortDesc)
    };
  }, [data]);

  const activeSourceLogs = tab === 'common' ? commonLogs : managerLogs;

  const actionOptions = useMemo(() => {
    const preset = tab === 'common' ? COMMON_ACTIONS : MANAGER_ACTIONS;
    const dynamic = activeSourceLogs.map(x => x.action).filter(Boolean);
    return Array.from(new Set([...preset, ...dynamic]));
  }, [tab, activeSourceLogs]);

  const actionSelectOptions = useMemo(() => {
    const base: Array<{ value: string; label: string }> = [
      { value: 'ALL', label: 'Tất cả hành động' }
    ];
    if (tab === 'common') {
      base.push({ value: 'LOT_GROUP', label: 'Duyệt / Trạng thái bãi' });
    }
    for (const act of actionOptions) {
      base.push({
        value: act,
        label: MANAGER_ACTION[act] || act
      });
    }
    return base;
  }, [tab, actionOptions]);

  const currentActionOption =
    actionSelectOptions.find(opt => opt.value === actionFilter) || actionSelectOptions[0];

  const filtered = useMemo(() => {
    const kw = search.trim().toLocaleLowerCase('vi-VN');
    return activeSourceLogs.filter(x => {
      if (actionFilter !== 'ALL') {
        if (actionFilter === 'LOT_GROUP') {
          if (!['APPROVE_LOT', 'REJECT_LOT', 'LOT_STATUS_CHANGED'].includes(x.action)) {
            return false;
          }
        } else if (x.action !== actionFilter) {
          return false;
        }
      }

      if (dateStart || dateEnd) {
        const dayKey = toVnDateKey(x.created_at);
        if (dateStart && (!dayKey || dayKey < dateStart)) return false;
        if (dateEnd && (!dayKey || dayKey > dateEnd)) return false;
      }

      if (!kw) return true;
      const haystacks = [
        `#${x.id}`,
        x.action,
        MANAGER_ACTION[x.action] || '',
        x.actor || '',
        x.actor_email || '',
        x.actor_role || '',
        x.entity_type || '',
        x.entity_id ? `#${x.entity_id}` : '',
        x.lot_name || '',
        x.note || ''
      ];
      return haystacks.some(val => val.toLocaleLowerCase('vi-VN').includes(kw));
    });
  }, [activeSourceLogs, actionFilter, dateStart, dateEnd, search]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, actionFilter, dateStart, dateEnd, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pagedLogs = filtered.slice(startIdx, startIdx + pageSize);

  function switchTab(nextTab: LogSourceTab) {
    setTab(nextTab);
    setActionFilter('ALL');
    setOpenMenu(null);
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setActionFilter('ALL');
    setDateStart('');
    setDateEnd('');
    setOpenMenu(null);
    setPage(1);
    notice('Đã khôi phục bộ lọc mặc định.');
  }

  function handleExport(format: 'CSV' | 'JSON') {
    setOpenMenu(null);
    if (!filtered.length) {
      notice('Không có bản ghi phù hợp để xuất file.', 'bad');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'CSV') {
      downloadCsv(
        [
          ['Nguồn', 'ID', 'Thời gian', 'Tác nhân', 'Vai trò', 'Sự kiện', 'Đối tượng', 'Bãi đỗ', 'Thay đổi', 'Ghi chú'],
          ...filtered.map(x => [
            x.source === 'manager' ? 'manager_history' : 'audit_logs',
            x.id,
            x.created_at,
            x.actor || 'Hệ thống',
            x.actor_role || '',
            x.action,
            `${x.entity_type || ''}#${x.entity_id || ''}`,
            x.lot_name || '',
            buildDiffPreview(x.old_value, x.new_value),
            x.note || ''
          ])
        ],
        `ezspace_audit_logs_${tab}_${stamp}.csv`
      );
      notice(`Đã xuất ${filtered.length} bản ghi dạng CSV.`);
    } else {
      downloadJson(filtered, `ezspace_audit_logs_${tab}_${stamp}.json`);
      notice(`Đã xuất ${filtered.length} bản ghi dạng JSON.`);
    }
  }

  if (!data) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void reload(true)} />;
    return <LoadingCard />;
  }

  const todayVn = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const todayCount = allLogs.filter(x => toVnDateKey(x.created_at) === todayVn).length;
  const configActionsCount = allLogs.filter(x =>
    [
      'APPROVE_LOT',
      'REJECT_LOT',
      'LOT_STATUS_CHANGED',
      'USER_STATUS_CHANGED',
      'UPDATE_SLOT',
      'PLATFORM_SETTINGS_UPDATED',
      'CACHE_FLUSHED',
      'lot_created',
      'lot_updated',
      'slot_updated',
      'pricing_updated'
    ].includes(x.action)
  ).length;
  const violationAndCancelCount = allLogs.filter(x =>
    ['AUTO_CANCEL_HOLD_EXPIRED', 'AUTO_FORFEIT_ARRIVAL_EXPIRED', 'reservation_cancelled'].includes(
      x.action
    )
  ).length;

  const quickPills: Array<{ label: string; value: string; toneClass: string }> =
    tab === 'common'
      ? [
          {
            label: 'Toàn bộ',
            value: 'ALL',
            toneClass: 'bg-slate-100 text-slate-700 hover:bg-brand-tint hover:text-brand'
          },
          {
            label: 'Duyệt / Trạng thái bãi',
            value: 'LOT_GROUP',
            toneClass: 'bg-green-100 text-green-700 hover:opacity-85'
          },
          {
            label: 'Cập nhật ô đỗ',
            value: 'UPDATE_SLOT',
            toneClass: 'bg-brand-tint text-brand hover:opacity-85'
          },
          {
            label: `Phạt No-Show (${arrivalMinutes}p)`,
            value: 'AUTO_FORFEIT_ARRIVAL_EXPIRED',
            toneClass: 'bg-red-100 text-red-700 hover:opacity-85'
          },
          {
            label: `Quá hạn giữ chỗ (${holdMinutes}p)`,
            value: 'AUTO_CANCEL_HOLD_EXPIRED',
            toneClass: 'bg-amber-100 text-amber-800 hover:opacity-85'
          }
        ]
      : [
          {
            label: 'Toàn bộ',
            value: 'ALL',
            toneClass: 'bg-slate-100 text-slate-700 hover:bg-brand-tint hover:text-brand'
          },
          {
            label: 'Cập nhật giá',
            value: 'pricing_updated',
            toneClass: 'bg-brand-tint text-brand hover:opacity-85'
          },
          {
            label: 'Cập nhật ô đỗ',
            value: 'slot_updated',
            toneClass: 'bg-brand-tint text-brand hover:opacity-85'
          },
          {
            label: 'Hủy đặt chỗ',
            value: 'reservation_cancelled',
            toneClass: 'bg-red-100 text-red-700 hover:opacity-85'
          }
        ];

  return (
    <>
      {/* Thanh trạng thái & hành động đầu trang */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-white px-5 py-3.5 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
            Giám sát nhật ký trực tiếp
          </span>
          <span className="text-xs font-medium text-slate-500">
            Theo dõi lịch sử thao tác quản trị và vận hành bãi đỗ theo thời gian thực
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={refreshing}
            className="btn btn-sm h-9"
          >
            <Icon
              name="sync"
              sizeClass={`h-4 w-4 ${refreshing ? 'animate-spin text-brand' : 'text-slate-600'}`}
            />
            <span>Đồng bộ</span>
          </button>

          <div className="relative inline-block text-left" ref={exportRef}>
            <button
              type="button"
              onClick={() => setOpenMenu(prev => (prev === 'export' ? null : 'export'))}
              className="btn btn-sm btn-primary h-9"
            >
              <Icon name="download" sizeClass="h-4 w-4" />
              <span>Xuất file Logs</span>
              <Icon name="expand_more" sizeClass="h-4 w-4" />
            </button>

            {openMenu === 'export' ? (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button
                  type="button"
                  onClick={() => handleExport('CSV')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  <Icon name="table_view" className="text-green-600" sizeClass="h-4 w-4" />
                  <span>Xuất dạng CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('JSON')}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-800 hover:bg-slate-100"
                >
                  <Icon name="data_object" className="text-brand" sizeClass="h-4 w-4" />
                  <span>Xuất dạng JSON</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Nhật ký hệ thống"
          value={nf(commonLogs.length)}
          icon="dataset"
          tone="brand"
          sub={`+${nf(todayCount)} ghi nhận trong hôm nay`}
        />
        <KpiCard
          label="Lịch sử vận hành bãi"
          value={nf(managerLogs.length)}
          icon="shield_person"
          tone="ok"
          sub="Cấu hình bãi, ô đỗ & bảng giá"
        />
        <KpiCard
          label="Kiểm duyệt & Cấu hình"
          value={nf(configActionsCount)}
          icon="admin_panel_settings"
          tone="warn"
          sub="Duyệt bãi, tài khoản, cài đặt & giá"
        />
        <KpiCard
          label="Quá hạn & Hủy / No-Show"
          value={nf(violationAndCancelCount)}
          icon="history_toggle_off"
          tone="bad"
          sub={`Quá hạn ${holdMinutes}p / No-Show ${arrivalMinutes}p / Hủy đơn`}
        />
      </section>

      {/* Main Surface Card */}
      <div className="flex flex-col rounded-[14px] border border-slate-200 bg-white shadow-card">
        {/* KHỐI A: TABS PHÂN LOẠI NHẬT KÝ */}
        <div className="flex items-center justify-between overflow-x-auto rounded-t-[14px] border-b border-slate-200 bg-slate-50/80 px-6 pt-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => switchTab('common')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl border border-b-0 px-4 py-3 text-[13px] font-bold transition-all ${
                tab === 'common'
                  ? 'border-slate-200 bg-white text-brand shadow-sm'
                  : 'border-transparent bg-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon name="assignment" sizeClass="h-[18px] w-[18px]" />
              <span>Nhật ký hệ thống</span>
              <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-bold text-brand">
                {nf(commonLogs.length)} logs
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab('manager')}
              className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl border border-b-0 px-4 py-3 text-[13px] font-bold transition-all ${
                tab === 'manager'
                  ? 'border-slate-200 bg-white text-brand shadow-sm'
                  : 'border-transparent bg-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon name="admin_panel_settings" sizeClass="h-[18px] w-[18px]" />
              <span>Nhật ký vận hành bãi</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                {nf(managerLogs.length)} logs
              </span>
            </button>
          </div>

          <div className="hidden items-center gap-2 pr-2 text-xs font-medium text-slate-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>Sắp xếp mới nhất trước</span>
          </div>
        </div>

        {/* KHỐI B: ACTION BAR & ADVANCED FILTERS */}
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-6">
          <div className="grid grid-cols-1 items-center gap-3.5 md:grid-cols-12">
            {/* Search Input */}
            <div className="relative md:col-span-5">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                sizeClass="h-[18px] w-[18px]"
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm theo ID, tên/email tác nhân, đối tượng (#1), bãi đỗ hoặc ghi chú..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-[13px] text-slate-900 placeholder:text-slate-400 transition hover:border-blue-300 focus:border-brand focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand/15"
              />
            </div>

            {/* Action Type Custom Dropdown */}
            <div className="relative md:col-span-3" ref={actionMenuRef}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={openMenu === 'action'}
                aria-label="Lọc theo hành động"
                onClick={() => setOpenMenu(prev => (prev === 'action' ? null : 'action'))}
                className={`flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[13px] font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-white focus-visible:border-brand focus-visible:bg-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15 ${
                  openMenu === 'action'
                    ? 'border-brand bg-white ring-[3px] ring-brand/15'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    name="filter_list"
                    className={openMenu === 'action' ? 'text-brand' : 'text-slate-400'}
                    sizeClass="h-[18px] w-[18px]"
                  />
                  <span className="truncate">{currentActionOption.label}</span>
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                    openMenu === 'action' ? 'rotate-180 text-brand' : 'text-slate-500'
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

              {openMenu === 'action' ? (
                <div
                  role="listbox"
                  aria-label="Lọc theo hành động"
                  className="absolute left-0 top-[calc(100%+6px)] z-30 flex max-h-[300px] w-full min-w-[240px] flex-col gap-0.5 overflow-y-auto rounded-xl border border-blue-200 bg-white p-1.5 shadow-[0_12px_28px_-4px_rgba(15,23,42,0.14),0_4px_10px_-2px_rgba(37,99,235,0.08)]"
                >
                  {actionSelectOptions.map(opt => {
                    const selected = opt.value === actionFilter;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setActionFilter(opt.value);
                          setOpenMenu(null);
                        }}
                        className={`flex w-full items-center justify-between gap-2.5 whitespace-nowrap rounded-lg px-[11px] py-2 text-left text-[13px] transition-colors ${
                          selected
                            ? 'bg-gradient-to-br from-blue-600 to-blue-700 font-bold text-white shadow-[0_2px_6px_rgba(37,99,235,0.22)] hover:from-blue-700 hover:to-blue-800'
                            : 'font-medium text-slate-600 hover:bg-brand-tint hover:text-brand'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
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

            {/* Date Range Filter */}
            <div className="flex items-center gap-2 md:col-span-4">
              <div className="relative flex-1">
                <Icon
                  name="calendar_today"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  sizeClass="h-4 w-4"
                />
                <input
                  type="date"
                  value={dateStart}
                  onChange={e => setDateStart(e.target.value)}
                  aria-label="Từ ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-2 text-xs font-medium text-slate-800 transition hover:border-blue-300 focus:border-brand focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                />
              </div>
              <span className="text-xs font-bold text-slate-400">-</span>
              <div className="relative flex-1">
                <Icon
                  name="calendar_today"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  sizeClass="h-4 w-4"
                />
                <input
                  type="date"
                  value={dateEnd}
                  onChange={e => setDateEnd(e.target.value)}
                  aria-label="Đến ngày"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-2 text-xs font-medium text-slate-800 transition hover:border-blue-300 focus:border-brand focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand/15"
                />
              </div>
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-slate-400">Lọc nhanh:</span>
            {quickPills.map(pill => {
              const selected = actionFilter === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setActionFilter(pill.value)}
                  className={`rounded-lg px-2.5 py-1 transition-all ${pill.toneClass} ${
                    selected ? 'ring-2 ring-brand/40' : ''
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              <Icon name="restart_alt" sizeClass="h-4 w-4" />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        </div>

        {/* KHỐI C: DATA TABLE 7 CỘT */}
        <div className="w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[920px] border-collapse text-left text-[12.5px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Thời gian &amp; Mã</th>
                <th className="px-4 py-3.5">Người thực hiện</th>
                <th className="px-4 py-3.5">Hành động</th>
                <th className="px-4 py-3.5">Đối tượng</th>
                <th className="px-4 py-3.5">Thay đổi dữ liệu</th>
                <th className="px-4 py-3.5">Lý do / Ghi chú</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pagedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="mx-auto flex max-w-md flex-col items-center">
                      <Icon name="find_in_page" className="mb-2 text-slate-400" sizeClass="h-11 w-11" />
                      <p className="text-sm font-bold text-slate-900">
                        Không tìm thấy bản ghi nhật ký phù hợp
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Hãy thử xóa bộ lọc hoặc tìm kiếm với từ khóa khác.
                      </p>
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="btn btn-sm btn-primary mt-4"
                      >
                        Xóa tất cả bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedLogs.map(log => {
                  const actorName = log.actor || 'Hệ thống';
                  const avatarChar = actorName.trim().charAt(0).toUpperCase() || 'H';
                  const roleKey = (log.actor_role || '').toLowerCase();
                  const roleBadge = ROLE_BADGE_MAP[roleKey] || 'bg-slate-100 text-slate-600';
                  const roleLabel = roleKey ? ROLE[roleKey] || roleKey.toUpperCase() : 'SYSTEM';
                  const actionBadge =
                    ACTION_BADGE_MAP[log.action] || 'bg-slate-100 text-slate-700';
                  const diffText = buildDiffPreview(log.old_value, log.new_value);

                  return (
                    <tr
                      key={`${log.source}-${log.id}`}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* Thời gian & Mã */}
                      <td className="py-4 pl-6 pr-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{dt(log.created_at)}</span>
                          <span className="mt-0.5 font-mono text-[11px] text-slate-400">
                            Mã #{n(log.id)}
                          </span>
                        </div>
                      </td>

                      {/* Người thực hiện */}
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-700">
                            {avatarChar}
                          </div>
                          <div className="min-w-0">
                            <span className="block truncate font-bold text-slate-900">
                              {actorName}
                            </span>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${roleBadge}`}
                              >
                                {roleLabel}
                              </span>
                              {log.actor_email ? (
                                <span className="truncate text-[11px] text-slate-400">
                                  {log.actor_email}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Hành động */}
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold ${actionBadge}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            <span>{MANAGER_ACTION[log.action] || log.action}</span>
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* Đối tượng */}
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col font-mono text-[12px]">
                          <span className="text-slate-400">{log.entity_type || '—'}</span>
                          <span className="font-bold text-slate-900">
                            #{n(log.entity_id)}
                          </span>
                          {log.lot_name ? (
                            <span className="mt-0.5 font-sans text-[11px] text-slate-500">
                              {log.lot_name}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Diff Preview */}
                      <td className="max-w-[220px] px-4 py-4 align-top">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="max-w-[165px] truncate rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-800"
                            title={diffText}
                          >
                            {diffText}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              openModal(
                                `Chi tiết nhật ký: ${MANAGER_ACTION[log.action] || log.action}`,
                                <LogDetailModal row={log} />
                              )
                            }
                            title="Xem Diff JSON"
                            className="rounded-lg p-1 text-brand hover:bg-brand-tint"
                          >
                            <Icon name="data_object" sizeClass="h-[17px] w-[17px]" />
                          </button>
                        </div>
                      </td>

                      {/* Lý do / Ghi chú */}
                      <td className="max-w-[230px] px-4 py-4 align-top">
                        <p className="truncate text-slate-600" title={log.note || '—'}>
                          {log.note || '—'}
                        </p>
                      </td>

                      {/* Hộp đen */}
                      <td className="py-4 pl-4 pr-6 text-right align-top">
                        <button
                          type="button"
                          onClick={() =>
                            openModal(
                              `Chi tiết nhật ký: ${MANAGER_ACTION[log.action] || log.action}`,
                              <LogDetailModal row={log} />
                            )
                          }
                          className="btn btn-sm ml-auto whitespace-nowrap"
                        >
                          <Icon name="visibility" sizeClass="h-4 w-4" />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* KHỐI D: PHÂN TRANG */}
        <div className="flex flex-col items-center justify-between gap-4 rounded-b-[14px] border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:flex-row">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span>
              Hiển thị{' '}
              <b className="text-slate-900">
                {filtered.length === 0 ? '0 - 0' : `${startIdx + 1} - ${Math.min(startIdx + pageSize, filtered.length)}`}
              </b>{' '}
              của <b className="text-slate-900">{nf(filtered.length)}</b> bản ghi
            </span>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Số dòng:</span>
              <div className="relative" ref={pageSizeMenuRef}>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openMenu === 'pageSize'}
                  aria-label="Số dòng mỗi trang"
                  onClick={() => setOpenMenu(prev => (prev === 'pageSize' ? null : 'pageSize'))}
                  className={`flex h-8 min-w-[68px] cursor-pointer items-center justify-between gap-1.5 rounded-lg border bg-white px-2.5 text-xs font-bold text-slate-800 transition hover:border-blue-300 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/15 ${
                    openMenu === 'pageSize'
                      ? 'border-brand ring-[3px] ring-brand/15'
                      : 'border-slate-200'
                  }`}
                >
                  <span>{pageSize}</span>
                  <svg
                    className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                      openMenu === 'pageSize' ? 'rotate-180 text-brand' : 'text-slate-500'
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

                {openMenu === 'pageSize' ? (
                  <div
                    role="listbox"
                    aria-label="Số dòng mỗi trang"
                    className="absolute bottom-[calc(100%+6px)] left-0 z-30 flex min-w-[84px] flex-col gap-0.5 rounded-xl border border-blue-200 bg-white p-1.5 shadow-[0_12px_28px_-4px_rgba(15,23,42,0.14),0_4px_10px_-2px_rgba(37,99,235,0.08)]"
                  >
                    {[10, 25, 50, 100].map(size => {
                      const selected = size === pageSize;
                      return (
                        <button
                          key={size}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setPageSize(size);
                            setOpenMenu(null);
                          }}
                          className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                            selected
                              ? 'bg-gradient-to-br from-blue-600 to-blue-700 font-bold text-white shadow-[0_2px_6px_rgba(37,99,235,0.22)] hover:from-blue-700 hover:to-blue-800'
                              : 'font-medium text-slate-600 hover:bg-brand-tint hover:text-brand'
                          }`}
                        >
                          <span>{size}</span>
                          {selected ? (
                            <svg
                              className="h-3.5 w-3.5 shrink-0"
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
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="btn btn-sm h-8 px-2.5"
            >
              <Icon name="chevron_left" sizeClass="h-4 w-4" />
              <span>Trước</span>
            </button>

            {getPageNumbers(safePage, totalPages).map((item, idx) =>
              item === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-xs text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`h-8 w-8 rounded-lg text-xs font-bold transition-colors ${
                    item === safePage
                      ? 'bg-brand text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-brand-tint hover:text-brand'
                  }`}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="btn btn-sm h-8 px-2.5"
            >
              <span>Sau</span>
              <Icon name="chevron_right" sizeClass="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
