'use client';

import { useCallback } from 'react';
import { LotDetailModal } from '@/components/LotDetailModal';
import { UserDetailModal } from '@/components/UserDetailModal';
import { useAdmin } from '@/context/AdminContext';
import { api } from '@/lib/api';
import { LOT, USER } from '@/lib/constants';
import { LotDetailResponse, UserDetailResponse } from '@/lib/types';

type LotActionKind =
  | 'lot-approve'
  | 'lot-activate'
  | 'lot-reconsider'
  | 'lot-reject'
  | 'lot-suspend';

type UserActionKind = 'user-lock' | 'user-inactive' | 'user-unlock';

const LOT_CONFIGS: Record<
  LotActionKind,
  {
    to: string;
    title: string;
    desc: string;
    withReason?: boolean;
    requireReason?: boolean;
    reasonLabel?: string;
    reasonPlaceholder?: string;
    suggestions?: string[];
    confirmText: string;
    confirmStyle: string;
  }
> = {
  'lot-approve': {
    to: 'active',
    title: 'Phê duyệt bãi đỗ xe',
    desc: 'Bãi đỗ sẽ được kích hoạt và mở nhận đặt chỗ trên toàn hệ thống.',
    confirmText: 'Phê duyệt ngay',
    confirmStyle: 'btn-ok'
  },
  'lot-activate': {
    to: 'active',
    title: 'Kích hoạt lại bãi đỗ xe',
    desc: 'Bãi đỗ sẽ hoạt động trở lại và cho phép khách hàng đặt chỗ.',
    confirmText: 'Kích hoạt lại',
    confirmStyle: 'btn-ok'
  },
  'lot-reconsider': {
    to: 'pending',
    title: 'Đưa bãi đỗ về chờ thẩm định',
    desc: 'Chuyển trạng thái bãi đỗ về danh sách chờ quản trị viên phê duyệt lại.',
    confirmText: 'Chuyển chờ duyệt',
    confirmStyle: 'btn-primary'
  },
  'lot-reject': {
    to: 'rejected',
    title: 'Từ chối hồ sơ bãi đỗ xe',
    desc: 'Vui lòng chọn hoặc nhập lý do từ chối để lưu vào nhật ký đối soát hệ thống.',
    withReason: true,
    requireReason: true,
    reasonLabel: 'Lý do từ chối phê duyệt',
    reasonPlaceholder: 'Nhập lý do từ chối bãi đỗ (tối thiểu 3 ký tự)...',
    suggestions: [
      'Hồ sơ pháp lý chưa đầy đủ',
      'Sơ đồ ô đỗ 2D chưa khớp thực tế',
      'Thông tin bảng giá chưa hợp lệ'
    ],
    confirmText: 'Xác nhận từ chối',
    confirmStyle: 'btn-danger'
  },
  'lot-suspend': {
    to: 'inactive',
    title: 'Tạm ngừng vận hành bãi đỗ',
    desc: 'Bãi đỗ sẽ tạm ngừng nhận đơn đặt chỗ mới cho đến khi được kích hoạt lại.',
    withReason: true,
    requireReason: true,
    reasonLabel: 'Lý do tạm ngừng',
    reasonPlaceholder: 'Nhập lý do tạm ngừng vận hành (tối thiểu 3 ký tự)...',
    suggestions: [
      'Bảo trì định kỳ hạ tầng bãi đỗ',
      'Tạm ngừng theo yêu cầu chủ bãi',
      'Kiểm tra quy chuẩn an toàn vận hành'
    ],
    confirmText: 'Tạm ngừng bãi',
    confirmStyle: 'btn-danger'
  }
};

const USER_CONFIGS: Record<
  UserActionKind,
  {
    to: string;
    title: string;
    desc: string;
    withReason?: boolean;
    requireReason?: boolean;
    reasonLabel?: string;
    reasonPlaceholder?: string;
    suggestions?: string[];
    confirmText: string;
    confirmStyle: string;
  }
> = {
  'user-lock': {
    to: 'banned',
    title: 'Khóa tài khoản người dùng',
    desc: 'Tài khoản bị khóa sẽ không thể đăng nhập hoặc đặt chỗ trên hệ thống.',
    withReason: true,
    requireReason: false,
    reasonLabel: 'Lý do khóa tài khoản',
    reasonPlaceholder: 'Nhập lý do khóa tài khoản...',
    suggestions: [
      'Vi phạm chính sách đặt chỗ nhiều lần',
      'Đặt chỗ nhưng không đến (No-show)',
      'Phát hiện hoạt động bất thường'
    ],
    confirmText: 'Khóa tài khoản',
    confirmStyle: 'btn-danger'
  },
  'user-inactive': {
    to: 'inactive',
    title: 'Tạm ngưng tài khoản',
    desc: 'Tạm ngưng quyền hoạt động của tài khoản cho đến khi được kích hoạt lại.',
    confirmText: 'Tạm ngưng',
    confirmStyle: 'btn-primary'
  },
  'user-unlock': {
    to: 'active',
    title: 'Kích hoạt / Mở khóa tài khoản',
    desc: 'Khôi phục toàn bộ quyền truy cập và giao dịch cho tài khoản này.',
    confirmText: 'Kích hoạt ngay',
    confirmStyle: 'btn-ok'
  }
};

export function useAdminActions(onSuccess?: () => void) {
  const { openModal, confirmAction, notice, setErrorBanner } = useAdmin();

  const openLotDetail = useCallback(
    async (id: number) => {
      try {
        const d = await api<LotDetailResponse>(`lots/${id}`);
        openModal(`Chi tiết bãi đỗ: ${d.lot.name}`, <LotDetailModal data={d} />);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Không thể tải chi tiết bãi đỗ.';
        setErrorBanner(msg);
        notice(msg, 'bad');
      }
    },
    [openModal, setErrorBanner, notice]
  );

  const mutateLot = useCallback(
    async (
      kind: LotActionKind,
      lot: { id: number; name?: string; address?: string }
    ) => {
      const cfg = LOT_CONFIGS[kind];
      const name = lot.name || `Bãi đỗ #${lot.id}`;
      const sub = lot.address ? `#${lot.id} · ${lot.address}` : `Mã bãi #${lot.id}`;

      const res = await confirmAction({
        title: cfg.title,
        targetName: name,
        targetSub: sub,
        statusTone: cfg.to,
        statusLabel: LOT[cfg.to] || cfg.to,
        description: cfg.desc,
        withReason: Boolean(cfg.withReason),
        requireReason: Boolean(cfg.requireReason),
        reasonLabel: cfg.reasonLabel,
        reasonPlaceholder: cfg.reasonPlaceholder,
        suggestions: cfg.suggestions || [],
        confirmText: cfg.confirmText,
        confirmStyle: cfg.confirmStyle
      });
      if (!res) return;

      try {
        await api(`lots/${lot.id}/status`, 'PATCH', {
          status: cfg.to,
          reason: res.reason
        });
        notice(`Đã cập nhật trạng thái bãi "${name}" sang ${LOT[cfg.to] || cfg.to}.`);
        onSuccess?.();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái bãi.';
        setErrorBanner(msg);
        notice(msg, 'bad');
      }
    },
    [confirmAction, notice, setErrorBanner, onSuccess]
  );

  const openUserDetail = useCallback(
    async (id: number) => {
      try {
        const d = await api<UserDetailResponse>(`users/${id}`);
        openModal(`Hồ sơ người dùng: ${d.user.full_name}`, <UserDetailModal data={d} />);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Không thể tải hồ sơ người dùng.';
        setErrorBanner(msg);
        notice(msg, 'bad');
      }
    },
    [openModal, setErrorBanner, notice]
  );

  const mutateUser = useCallback(
    async (
      kind: UserActionKind,
      user: { id: number; full_name?: string; email?: string }
    ) => {
      const cfg = USER_CONFIGS[kind];
      const name = user.full_name || `Tài khoản #${user.id}`;
      const sub = user.email ? `#${user.id} · ${user.email}` : `ID #${user.id}`;

      const res = await confirmAction({
        title: cfg.title,
        targetName: name,
        targetSub: sub,
        statusTone: cfg.to,
        statusLabel: USER[cfg.to] || cfg.to,
        description: cfg.desc,
        withReason: Boolean(cfg.withReason),
        requireReason: Boolean(cfg.requireReason),
        reasonLabel: cfg.reasonLabel,
        reasonPlaceholder: cfg.reasonPlaceholder,
        suggestions: cfg.suggestions || [],
        confirmText: cfg.confirmText,
        confirmStyle: cfg.confirmStyle
      });
      if (!res) return;

      try {
        await api(`users/${user.id}/status`, 'PATCH', {
          status: cfg.to,
          reason: res.reason
        });
        notice(`Đã cập nhật trạng thái tài khoản "${name}" sang ${USER[cfg.to] || cfg.to}.`);
        onSuccess?.();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Không thể cập nhật trạng thái tài khoản.';
        setErrorBanner(msg);
        notice(msg, 'bad');
      }
    },
    [confirmAction, notice, setErrorBanner, onSuccess]
  );

  return { openLotDetail, mutateLot, openUserDetail, mutateUser };
}

