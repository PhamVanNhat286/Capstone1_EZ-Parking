/* =============================================================
   EZ-SPACE ADMIN - js/core/constants.js
   Ánh xạ đầy đủ các kiểu ENUM từ database/schema.sql
   ============================================================= */
'use strict';

const ROLE = {
  customer: 'Khách hàng',
  manager: 'Chủ bãi',
  admin: 'Quản trị viên'
};

const USER = {
  active: 'Hoạt động',
  inactive: 'Tạm ngưng',
  banned: 'Bị khóa'
};

const LOT = {
  pending: 'Chờ duyệt',
  active: 'Hoạt động',
  inactive: 'Tạm ngừng',
  rejected: 'Từ chối'
};

const SLOT_STATUS = {
  available: 'Trống',
  holding: 'Đang giữ chỗ',
  occupied: 'Đã có xe đỗ',
  unavailable: 'Ngưng sử dụng'
};

const SLOT_TYPE = {
  standard: 'Tiêu chuẩn',
  ev_charging: 'Trạm sạc EV',
  large: 'Xe lớn / SUV',
  disabled: 'Ưu tiên KT'
};

const RES = {
  holding: 'Giữ chỗ',
  paid: 'Đã cọc',
  entered: 'Đã vào',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  forfeited: 'No-show',
  refunded: 'Đã hoàn'
};

const PAY_PROVIDER = {
  vnpay: 'VNPay',
  momo: 'MoMo',
  card: 'Thẻ (Card)'
};

const PAY_TYPE = {
  deposit: 'Tiền cọc',
  final: 'Tất toán',
  refund: 'Hoàn tiền'
};

const PAY_STATUS = {
  pending: 'Chờ xử lý',
  success: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Đã hoàn'
};

const QR_STATUS = {
  active: 'Còn hiệu lực',
  used: 'Đã quét vào',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy'
};

const SESSION_STATUS = {
  active: 'Xe đang đỗ',
  completed: 'Đã rời bãi',
  abandoned: 'Không ra đúng cách'
};

const MANAGER_ACTION = {
  lot_created: 'Tạo bãi đỗ',
  lot_updated: 'Cập nhật bãi',
  slot_updated: 'Cập nhật ô đỗ',
  pricing_updated: 'Cập nhật bảng giá',
  reservation_cancelled: 'Hủy đặt chỗ',
  report_viewed: 'Xem báo cáo',
  APPROVE_LOT: 'Duyệt mở bãi đỗ',
  UPDATE_SLOT: 'Cập nhật trạng thái ô đỗ',
  LOT_STATUS_CHANGED: 'Đổi trạng thái bãi đỗ',
  USER_STATUS_CHANGED: 'Đổi trạng thái tài khoản',
  HOLD_SPOT: 'Giữ chỗ đặt lịch',
  AUTO_CANCEL_HOLD_EXPIRED: 'Tự động hủy giữ chỗ quá hạn',
  AUTO_FORFEIT_ARRIVAL_EXPIRED: 'Tự động thu cọc quá hạn đến bãi'
};

const OTP_PURPOSE = {
  FORGOT_PASSWORD: 'Quên mật khẩu',
  VERIFY_EMAIL: 'Xác thực email',
  REGISTER: 'Đăng ký tài khoản'
};

const CHAT_ROLE = {
  user: 'Khách hàng',
  ai: 'Trợ lý AI'
};

const COLORS = {
  active: 'ok',
  available: 'ok',
  success: 'ok',
  completed: 'ok',
  entered: 'ok',
  used: 'brand',
  paid: 'brand',
  admin: 'brand',
  manager: 'warn',
  customer: 'muted',
  user: 'brand',
  ai: 'ok',
  pending: 'warn',
  holding: 'warn',
  abandoned: 'warn',
  inactive: 'muted',
  unavailable: 'muted',
  refunded: 'muted',
  expired: 'muted',
  cancelled: 'bad',
  rejected: 'bad',
  banned: 'bad',
  forfeited: 'bad',
  occupied: 'bad',
  failed: 'bad'
};

