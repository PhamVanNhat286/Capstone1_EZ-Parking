'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ErrorCard, LoadingCard } from '@/components/PageState';
import { Pill } from '@/components/Pill';
import { SectionCard } from '@/components/SectionCard';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/lib/api';
import { PAY_PROVIDER } from '@/lib/constants';
import { money } from '@/lib/format';
import { PlatformConfig, SettingsResponse } from '@/lib/types';
import { useAdminPageData } from '@/lib/useAdminPageData';

export default function SettingsPage() {
  const { notice, confirmAction, triggerRefresh } = useAdmin();
  const { data, loadError, reload } = useAdminPageData<SettingsResponse>(
    'settings',
    'Không thể tải cài đặt nền tảng.'
  );

  const [draft, setDraft] = useState<PlatformConfig | null>(null);
  const lastServerSnapshotRef = useRef<string>('');
  const [saving, setSaving] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingState, setPingState] = useState<{
    ok: boolean;
    label: string;
    detail: string;
  }>({
    ok: true,
    label: 'Sandbox Ready · IPN Webhook',
    detail: ''
  });

  const serverConfig = data?.config;
  const serverSnapshot = serverConfig ? JSON.stringify(serverConfig) : '';
  const isDirty = Boolean(draft && serverSnapshot && JSON.stringify(draft) !== serverSnapshot);

  useEffect(() => {
    if (!serverConfig) return;
    if (!draft) {
      lastServerSnapshotRef.current = serverSnapshot;
      setDraft({ ...serverConfig });
      return;
    }
    const wasDirtyBeforeSync =
      lastServerSnapshotRef.current !== '' &&
      JSON.stringify(draft) !== lastServerSnapshotRef.current;

    if (serverSnapshot !== lastServerSnapshotRef.current) {
      lastServerSnapshotRef.current = serverSnapshot;
      if (!wasDirtyBeforeSync) {
        setDraft({ ...serverConfig });
      }
    }
  }, [serverConfig, serverSnapshot, draft]);

  if (!data || !draft) {
    if (loadError) return <ErrorCard message={loadError} onRetry={() => void reload(true)} />;
    return <LoadingCard />;
  }

  const defaults = data.defaults;
  const providers = data.enums?.payment_providers || [];
  const gatewayStatsMap = new Map(
    (data.gateway_stats || []).map(item => [item.provider, item])
  );
  const ownerShare = Math.round((100 - (Number(draft.commission_rate) || 0)) * 10) / 10;

  async function handleCopyTerminal() {
    try {
      await navigator.clipboard.writeText(draft?.vnpay_tmn_code || '');
      notice('Đã sao chép Terminal ID vào bộ nhớ tạm!');
    } catch {
      notice('Không thể sao chép Terminal ID.', 'bad');
    }
  }

  async function handleTestPing() {
    setPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      const elapsed = Math.max(1, Math.round(performance.now() - start));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { ok?: boolean; db?: string };
      const detail = `HTTP 200 OK · Latency: ${elapsed}ms · DB: ${payload.db || 'postgresql'}`;
      setPingState({
        ok: true,
        label: `Đã kết nối ổn định · ${elapsed}ms`,
        detail
      });
      notice(`Kiểm tra kết nối thành công (${detail}).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối máy chủ.';
      setPingState({
        ok: false,
        label: 'Mất kết nối máy chủ',
        detail: `Lỗi: ${msg}`
      });
      notice(`Kiểm tra kết nối thất bại: ${msg}`, 'bad');
    } finally {
      setPinging(false);
    }
  }

  async function handleSaveChanges() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await api<{ ok: boolean; config: PlatformConfig }>(
        'settings',
        'PATCH',
        {
          hold_timeout_minutes: Number(draft.hold_timeout_minutes),
          arrival_timeout_minutes: Number(draft.arrival_timeout_minutes),
          deposit_amount: Number(draft.deposit_amount),
          commission_rate: Number(draft.commission_rate),
          vnpay_tmn_code: draft.vnpay_tmn_code,
          ipn_webhook_url: draft.ipn_webhook_url,
          maintenance_mode: Boolean(draft.maintenance_mode)
        }
      );
      lastServerSnapshotRef.current = JSON.stringify(res.config);
      setDraft({ ...res.config });
      notice('Đã lưu cấu hình nền tảng và áp dụng trực tiếp trên toàn Admin Portal.');
      await reload(true);
      triggerRefresh();
    } catch (err) {
      notice(err instanceof Error ? err.message : 'Không thể lưu cấu hình.', 'bad');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefaults() {
    const confirmed = await confirmAction({
      title: 'Khôi phục tham số mặc định',
      targetName: 'Cấu hình nền tảng EZ-Space',
      targetSub: `Giữ chỗ ${defaults.hold_timeout_minutes}p · No-show ${defaults.arrival_timeout_minutes}p · Cọc ${money(defaults.deposit_amount)} · Hoa hồng ${defaults.commission_rate}%`,
      statusTone: 'brand',
      statusLabel: 'Mặc định',
      description:
        'Đưa toàn bộ tham số về giá trị chuẩn đồng bộ với App và lưu vào nhật ký hệ thống.',
      confirmText: 'Khôi phục mặc định',
      confirmStyle: 'btn-primary'
    });
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await api<{ ok: boolean; config: PlatformConfig }>(
        'settings',
        'PATCH',
        { ...defaults }
      );
      lastServerSnapshotRef.current = JSON.stringify(res.config);
      setDraft({ ...res.config });
      notice('Đã khôi phục cấu hình về giá trị mặc định của nền tảng.');
      await reload(true);
      triggerRefresh();
    } catch (err) {
      notice(err instanceof Error ? err.message : 'Không thể khôi phục mặc định.', 'bad');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* KHỐI A: THAM SỐ THỜI GIAN, TIỀN CỌC & VÒNG ĐỜI NGHIỆP VỤ */}
      <section className="space-y-5 rounded-[14px] border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
              <Icon name="timer" sizeClass="h-[22px] w-[22px]" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-slate-900">
                Tham số thời gian, tiền cọc &amp; vòng đời đặt chỗ
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Quy định thời gian khóa ô đỗ, xử lý vi phạm trễ hẹn No-show, mức cọc mẫu và tỷ lệ hoa hồng nền tảng.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* 1. Hold TTL */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-slate-300">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="holdTtlInput" className="text-[13.5px] font-bold text-slate-800">
                  Thời gian giữ chỗ chờ cọc
                </label>
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-extrabold text-brand">
                  TTL Lock
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Thời gian tối đa giữ suất đỗ trước khi tự động hủy nếu khách chưa hoàn tất thanh toán cọc.
              </p>
            </div>
            <div className="pt-1">
              <div className="relative flex items-center">
                <input
                  id="holdTtlInput"
                  type="number"
                  min={3}
                  max={30}
                  value={draft.hold_timeout_minutes}
                  onChange={e =>
                    setDraft(prev =>
                      prev ? { ...prev, hold_timeout_minutes: Number(e.target.value) } : prev
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-14 text-[15px] font-bold text-slate-900 focus:border-brand focus:outline-none"
                />
                <span className="pointer-events-none absolute right-3.5 text-xs font-semibold text-slate-500">
                  phút
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Khuyến nghị: 10 phút</span>
                <span>Tối thiểu: 3 phút</span>
              </div>
            </div>
          </div>

          {/* 2. No-show Window */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-slate-300">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="noshowInput" className="text-[13.5px] font-bold text-slate-800">
                  Giới hạn trễ hẹn (No-show)
                </label>
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                  Penalties
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Khoảng thời gian cho phép khách check-in QR sau khi trả cọc trước khi bị tính No-show.
              </p>
            </div>
            <div className="pt-1">
              <div className="relative flex items-center">
                <input
                  id="noshowInput"
                  type="number"
                  min={5}
                  max={60}
                  value={draft.arrival_timeout_minutes}
                  onChange={e =>
                    setDraft(prev =>
                      prev ? { ...prev, arrival_timeout_minutes: Number(e.target.value) } : prev
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-14 text-[15px] font-bold text-slate-900 focus:border-brand focus:outline-none"
                />
                <span className="pointer-events-none absolute right-3.5 text-xs font-semibold text-slate-500">
                  phút
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Khuyến nghị: 20 phút</span>
                <span>Tịch thu cọc: 100%</span>
              </div>
            </div>
          </div>

          {/* 3. Deposit Sample */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-slate-300">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="depositInput" className="text-[13.5px] font-bold text-slate-800">
                  Mức tiền cọc giữ chỗ mẫu
                </label>
                <span className="rounded bg-brand-tint px-1.5 py-0.5 text-[10px] font-extrabold text-brand">
                  Deposit
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Khoản cọc tiêu chuẩn đồng bộ với App khi đặt ô và được khấu trừ lúc tất toán tại Kiosk.
              </p>
            </div>
            <div className="pt-1">
              <div className="relative flex items-center">
                <input
                  id="depositInput"
                  type="number"
                  min={10000}
                  max={500000}
                  step={5000}
                  value={draft.deposit_amount}
                  onChange={e =>
                    setDraft(prev =>
                      prev ? { ...prev, deposit_amount: Number(e.target.value) } : prev
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-14 text-[15px] font-bold text-slate-900 focus:border-brand focus:outline-none"
                />
                <span className="pointer-events-none absolute right-3.5 text-xs font-semibold text-slate-500">
                  VNĐ
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Mặc định: {money(defaults.deposit_amount)}</span>
                <span>Khấu trừ khi ra bãi</span>
              </div>
            </div>
          </div>

          {/* 4. Commission Rate */}
          <div className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 transition-colors hover:border-slate-300">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="commissionInput" className="text-[13.5px] font-bold text-slate-800">
                  Hoa hồng nền tảng mặc định
                </label>
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-extrabold text-green-700">
                  Revenue
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Áp dụng trực tiếp lên toàn bộ tính toán doanh thu Admin tại Tổng quan &amp; Báo cáo doanh thu.
              </p>
            </div>
            <div className="pt-1">
              <div className="relative flex items-center">
                <input
                  id="commissionInput"
                  type="number"
                  min={1}
                  max={30}
                  step={0.5}
                  value={draft.commission_rate}
                  onChange={e =>
                    setDraft(prev =>
                      prev ? { ...prev, commission_rate: Number(e.target.value) } : prev
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-3.5 pr-12 text-[15px] font-bold text-slate-900 focus:border-brand focus:outline-none"
                />
                <span className="pointer-events-none absolute right-3.5 text-sm font-bold text-slate-500">
                  %
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Chủ bãi nhận: {ownerShare}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KHỐI B: CẤU HÌNH CỔNG THANH TOÁN */}
      <section className="space-y-5 rounded-[14px] border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
              <Icon name="payments" sizeClass="h-[22px] w-[22px]" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-slate-900">
                Cổng thanh toán tích hợp
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Quản lý kết nối thanh toán đặt cọc và địa chỉ nhận thông báo giao dịch (IPN).
              </p>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 self-start rounded-lg border px-3 py-1.5 text-xs font-bold sm:self-auto ${
              pingState.ok
                ? 'border-green-200 bg-green-100 text-green-700'
                : 'border-red-200 bg-red-100 text-red-700'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                pingState.ok ? 'animate-pulse bg-green-600' : 'bg-red-600'
              }`}
            />
            <span>{pingState.label}</span>
          </div>
        </div>

        {/* Supported Providers Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Kênh hỗ trợ:</span>
          {providers.map(provider => {
            const stat = gatewayStatsMap.get(provider);
            const statText = stat
              ? `${stat.success_transactions} GD · ${money(stat.total_amount)}`
              : '0 GD';
            return (
              <Pill
                key={provider}
                tone={provider === 'vnpay' ? 'brand' : provider === 'momo' ? 'warn' : 'ok'}
                label={`${PAY_PROVIDER[provider] || provider} (${statText})`}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Terminal ID */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="terminalIdInput" className="text-[13.5px] font-bold text-slate-800">
                Mã định danh Terminal ID
              </label>
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                vnp_TmnCode
              </span>
            </div>
            <div className="relative flex items-center">
              <Icon
                name="badge"
                className="pointer-events-none absolute left-3.5 text-slate-400"
                sizeClass="h-[18px] w-[18px]"
              />
              <input
                id="terminalIdInput"
                type="text"
                value={draft.vnpay_tmn_code}
                onChange={e =>
                  setDraft(prev => (prev ? { ...prev, vnpay_tmn_code: e.target.value } : prev))
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-24 font-mono text-[13px] font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleCopyTerminal()}
                className="absolute right-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:border-brand hover:text-brand"
              >
                Sao chép
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Mã định danh trạm thanh toán dùng khi khởi tạo giao dịch đặt cọc.
            </p>
          </div>

          {/* IPN Callback */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="ipnUrlInput" className="text-[13.5px] font-bold text-slate-800">
                IPN Callback / Thanh toán cọc
              </label>
            </div>
            <div className="relative flex items-center">
              <Icon
                name="webhook"
                className="pointer-events-none absolute left-3.5 text-slate-400"
                sizeClass="h-[18px] w-[18px]"
              />
              <input
                id="ipnUrlInput"
                type="text"
                value={draft.ipn_webhook_url}
                onChange={e =>
                  setDraft(prev => (prev ? { ...prev, ipn_webhook_url: e.target.value } : prev))
                }
                className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-3 font-mono text-[13px] font-semibold text-brand focus:border-brand focus:bg-white focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-500">
              Địa chỉ nhận phản hồi trạng thái thanh toán tự động.
              {pingState.detail ? (
                <span
                  className={`ml-2 font-mono font-bold ${
                    pingState.ok ? 'text-green-700' : 'text-red-600'
                  }`}
                >
                  [{pingState.detail}]
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={pinging}
            onClick={() => void handleTestPing()}
            className="btn btn-sm h-9 whitespace-nowrap"
          >
            <Icon
              name="sync"
              sizeClass={`h-4 w-4 ${pinging ? 'animate-spin text-brand' : ''}`}
            />
            <span>{pinging ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
          </button>
        </div>
      </section>

      {/* KHỐI C: QUẢN LÝ HỆ THỐNG & BẢO TRÌ */}
      <section className="space-y-5 rounded-[14px] border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Icon name="build_circle" sizeClass="h-[22px] w-[22px]" />
            </div>
            <div>
              <h2 className="text-[18px] font-extrabold text-slate-900">
                Quản lý hệ thống &amp; Bảo trì
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Kiểm soát trạng thái bảo trì trên toàn hệ thống EZ-Space.
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex flex-col justify-between gap-4 rounded-xl border p-4 transition-colors md:flex-row md:items-center ${
            draft.maintenance_mode
              ? 'border-amber-300 bg-amber-50/40'
              : 'border-slate-200 bg-slate-50/60'
          }`}
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14.5px] font-bold text-slate-900">
                Chế độ bảo trì hệ thống
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${
                  draft.maintenance_mode
                    ? 'border border-amber-200 bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {draft.maintenance_mode ? 'ĐANG BẬT' : 'ĐANG TẮT'}
              </span>
            </div>
            <p className="max-w-2xl text-[13px] leading-relaxed text-slate-500">
              Tạm ngưng nhận lượt đặt chỗ mới trên hệ thống trong thời gian bảo trì hoặc nâng cấp.
            </p>
            {draft.maintenance_mode ? (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-100/80 p-3 text-amber-900">
                <Icon name="warning" className="mt-0.5 shrink-0 text-amber-700" sizeClass="h-[18px] w-[18px]" />
                <span className="text-xs font-semibold">
                  {serverConfig?.maintenance_mode
                    ? 'Cảnh báo: Chế độ bảo trì đang được kích hoạt trên hệ thống.'
                    : 'Chế độ bảo trì đang ở bản nháp — bấm "Lưu thay đổi cấu hình" để áp dụng toàn hệ thống.'}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3 self-end md:self-auto">
            <span
              className={`text-[13px] ${
                draft.maintenance_mode ? 'font-bold text-amber-700' : 'font-semibold text-slate-500'
              }`}
            >
              {draft.maintenance_mode ? 'Bật' : 'Tắt'}
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={draft.maintenance_mode}
                onChange={e =>
                  setDraft(prev =>
                    prev ? { ...prev, maintenance_mode: e.target.checked } : prev
                  )
                }
                aria-label="Chế độ bảo trì hệ thống"
                className="peer sr-only"
              />
              <div className="h-6 w-12 rounded-full bg-slate-300 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-6 peer-checked:after:border-white" />
            </label>
          </div>
        </div>
      </section>

      {/* Bottom Save Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-[14px] border border-slate-200 bg-white px-5 py-4 shadow-card sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2.5 text-[13px] text-slate-500">
          <Icon name="info" className="shrink-0 text-brand" sizeClass="h-5 w-5" />
          <span>Mọi thay đổi cấu hình sẽ được áp dụng ngay sau khi lưu.</span>
          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              Có thay đổi chưa lưu
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleResetDefaults()}
            className="btn btn-sm"
          >
            <Icon name="restore" sizeClass="h-4 w-4" />
            <span>Khôi phục mặc định</span>
          </button>
          <button
            type="button"
            disabled={!isDirty || saving}
            onClick={() => {
              if (serverConfig) {
                setDraft({ ...serverConfig });
                notice('Đã hoàn tác các thay đổi chưa lưu.');
              }
            }}
            className="btn btn-sm"
          >
            Hủy thay đổi
          </button>
          <button
            type="button"
            disabled={!isDirty || saving}
            onClick={() => void handleSaveChanges()}
            className="btn btn-sm btn-primary px-5 py-2.5"
          >
            <Icon name="save" sizeClass="h-4 w-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi cấu hình'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
