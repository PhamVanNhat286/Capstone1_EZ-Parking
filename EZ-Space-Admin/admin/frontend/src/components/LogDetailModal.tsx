'use client';

import { Icon } from '@/components/Icon';
import { useAdmin } from '@/context/AdminContext';
import { MANAGER_ACTION, ROLE } from '@/lib/constants';
import { dt, n } from '@/lib/format';
import { LogRecord } from '@/lib/types';

interface LogDetailModalProps {
  row: LogRecord;
}

const ACTION_BADGE_MAP: Record<string, string> = {
  APPROVE_LOT: 'bg-green-100 text-green-700',
  lot_created: 'bg-green-100 text-green-700',
  HOLD_SPOT: 'bg-brand-tint text-brand',
  UPDATE_SLOT: 'bg-brand-tint text-brand',
  slot_updated: 'bg-brand-tint text-brand',
  pricing_updated: 'bg-brand-tint text-brand',
  lot_updated: 'bg-brand-tint text-brand',
  USER_STATUS_CHANGED: 'bg-amber-100 text-amber-800',
  LOT_STATUS_CHANGED: 'bg-amber-100 text-amber-800',
  AUTO_CANCEL_HOLD_EXPIRED: 'bg-amber-100 text-amber-800',
  AUTO_FORFEIT_ARRIVAL_EXPIRED: 'bg-red-100 text-red-700',
  REJECT_LOT: 'bg-red-100 text-red-700',
  reservation_cancelled: 'bg-red-100 text-red-700',
  PLATFORM_SETTINGS_UPDATED: 'bg-brand-tint text-brand'
};

export function LogDetailModal({ row }: LogDetailModalProps) {
  const { notice } = useAdmin();
  const sourceTable = row.source === 'manager' ? 'manager_history' : 'audit_logs';
  const badgeClass = ACTION_BADGE_MAP[row.action] || 'bg-slate-100 text-slate-700';
  const roleLabel = row.actor_role ? ROLE[row.actor_role] || row.actor_role : 'Hệ thống';

  async function handleCopyDiff() {
    const payload = {
      id: n(row.id),
      source: sourceTable,
      action: row.action,
      action_label: MANAGER_ACTION[row.action] || row.action,
      actor: row.actor || 'Hệ thống',
      actor_email: row.actor_email || null,
      actor_role: row.actor_role || null,
      entity: `${row.entity_type || '—'} #${n(row.entity_id)}`,
      lot_name: row.lot_name || null,
      created_at: row.created_at,
      note: row.note || null,
      diff: {
        old_value: row.old_value ?? null,
        new_value: row.new_value ?? null
      }
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      notice('Đã sao chép JSON Diff vào bộ nhớ tạm!');
    } catch {
      notice('Không thể sao chép vào bộ nhớ tạm.', 'bad');
    }
  }

  return (
    <div className="space-y-5">
      {/* Banner thông tin bản ghi */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <Icon name="terminal" sizeClass="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] font-extrabold text-slate-900">
                {MANAGER_ACTION[row.action] || row.action}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${badgeClass}`}>
                {row.action}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Phân loại:{' '}
              <span className="font-semibold text-slate-700">
                {row.source === 'manager' ? 'Vận hành bãi đỗ' : 'Quản trị hệ thống'}
              </span>{' '}
              · Mã bản ghi: <span className="font-mono font-bold text-slate-700">#{n(row.id)}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleCopyDiff()}
          className="btn btn-sm"
        >
          <Icon name="content_copy" sizeClass="h-4 w-4" />
          <span>Sao chép JSON Diff</span>
        </button>
      </div>

      {/* Metadata 4 cột */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Mã bản ghi
          </span>
          <span className="mt-1 block font-mono text-[13px] font-bold text-slate-900">
            #{n(row.id)}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Người thực hiện
          </span>
          <span className="mt-1 block text-[13px] font-bold text-slate-900">
            {row.actor || 'Hệ thống'} ({roleLabel})
          </span>
          {row.actor_email ? (
            <span className="block truncate text-[11.5px] text-slate-500">{row.actor_email}</span>
          ) : null}
        </div>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Đối tượng tác động
          </span>
          <span className="mt-1 block font-mono text-[13px] font-bold text-brand">
            {row.entity_type || '—'} #{n(row.entity_id)}
          </span>
          <span className="block truncate text-[11.5px] text-slate-500">
            {row.lot_name || 'Toàn nền tảng'}
          </span>
        </div>
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Thời gian (UTC+7)
          </span>
          <span className="mt-1 block text-[13px] font-bold text-slate-900">
            {dt(row.created_at)}
          </span>
        </div>
      </div>

      {/* Lý do / Ghi chú */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-brand-tint p-3.5">
        <Icon name="comment" className="mt-0.5 text-brand" sizeClass="h-[18px] w-[18px]" />
        <div className="min-w-0">
          <span className="block text-xs font-bold text-brand">Lý do / Ghi chú thay đổi:</span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-700">
            {row.note || 'Không có ghi chú đính kèm.'}
          </span>
        </div>
      </div>

      {/* Chi tiết dữ liệu thay đổi */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[13px] font-extrabold text-slate-900">
            Chi tiết dữ liệu thay đổi
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-3.5">
            <div className="mb-2 text-xs font-bold text-red-700">
              Trước khi thay đổi
            </div>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-red-100 bg-white p-3 font-mono text-xs leading-relaxed text-red-700">
              {row.old_value !== null && row.old_value !== undefined
                ? JSON.stringify(row.old_value, null, 2)
                : 'Không có dữ liệu trước đó (Bản ghi mới)'}
            </pre>
          </div>

          <div className="rounded-xl border border-green-200/80 bg-green-50/50 p-3.5">
            <div className="mb-2 text-xs font-bold text-green-700">
              Sau khi thay đổi
            </div>
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-green-100 bg-white p-3 font-mono text-xs leading-relaxed text-green-700">
              {row.new_value !== null && row.new_value !== undefined
                ? JSON.stringify(row.new_value, null, 2)
                : 'Không có dữ liệu mới'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
