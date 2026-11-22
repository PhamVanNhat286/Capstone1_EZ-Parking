export const ROLE: Record<string, string> = {
  customer: 'Khách hàng',
  manager: 'Chủ bãi',
  admin: 'Quản trị viên'
};

export const USER: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Tạm ngưng',
  banned: 'Bị khóa'
};

export const LOT: Record<string, string> = {
  pending: 'Chờ duyệt',
  active: 'Hoạt động',
  inactive: 'Tạm ngừng',
  rejected: 'Từ chối'
};

export const SLOT_STATUS: Record<string, string> = {
  available: 'Trống',
  holding: 'Đang giữ chỗ',
  occupied: 'Đã có xe đỗ',
  unavailable: 'Ngưng sử dụng'
};

export const SLOT_TYPE: Record<string, string> = {
  standard: 'Tiêu chuẩn',
  ev_charging: 'Trạm sạc EV',
  large: 'Xe lớn / SUV',
  disabled: 'Ưu tiên KT'
};

export const RES: Record<string, string> = {
  holding: 'Giữ chỗ',
  paid: 'Đã cọc',
  entered: 'Đã vào',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  forfeited: 'No-show',
  refunded: 'Đã hoàn'
};

export const PAY_PROVIDER: Record<string, string> = {
  vnpay: 'VNPay',
  momo: 'MoMo',
  card: 'Thẻ (Card)'
};

export const PAY_TYPE: Record<string, string> = {
  deposit: 'Tiền cọc',
  final: 'Tất toán',
  refund: 'Hoàn tiền'
};

export const PAY_STATUS: Record<string, string> = {
  pending: 'Chờ xử lý',
  success: 'Thành công',
  failed: 'Thất bại',
  refunded: 'Đã hoàn'
};

export const QR_STATUS: Record<string, string> = {
  active: 'Còn hiệu lực',
  used: 'Đã quét vào',
  expired: 'Hết hạn',
  cancelled: 'Đã hủy'
};

export const SESSION_STATUS: Record<string, string> = {
  active: 'Xe đang đỗ',
  completed: 'Đã rời bãi',
  abandoned: 'Không ra đúng cách'
};

export const MANAGER_ACTION: Record<string, string> = {
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

export const OTP_PURPOSE: Record<string, string> = {
  FORGOT_PASSWORD: 'Quên mật khẩu',
  VERIFY_EMAIL: 'Xác thực email',
  REGISTER: 'Đăng ký tài khoản'
};

export const CHAT_ROLE: Record<string, string> = {
  user: 'Khách hàng',
  ai: 'Trợ lý AI'
};

export const COLORS: Record<string, string> = {
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
  failed: 'bad',
  ok: 'ok',
  warn: 'warn',
  bad: 'bad',
  brand: 'brand',
  muted: 'muted',
  deposit: 'brand',
  final: 'ok',
  refund: 'warn'
};

