import type { OverviewLot, ParkingSession } from "./overview-model";

export type GateMode = "in" | "out";
export type GateResult = { status: "valid" | "rejected"; title: string; message: string; session?: ParkingSession; mode: GateMode; lotId: string; total: number; due: number };

// QR in this preview contains a demo booking code or { lotId, sessionId }.
// A production integration must verify signed tickets on the server.
export function inspectGateTicket(lot: OverviewLot, raw: string, mode: GateMode, paused = false): GateResult {
  const reject = (title: string, message: string): GateResult => ({ status: "rejected", title, message, mode, lotId: lot.id, total: 0, due: 0 });
  let id = raw.trim().toUpperCase();
  if (!id) return reject("Chưa có mã vé", "Nhập mã đặt chỗ hoặc quét QR trên vé.");
  if (raw.trim().startsWith("{")) {
    try {
      const ticket = JSON.parse(raw);
      if (!ticket || typeof ticket.lotId !== "string" || typeof ticket.sessionId !== "string") return reject("Mã QR không hợp lệ", "QR cần có mã bãi và mã đặt chỗ.");
      if (ticket.lotId !== lot.id) return reject("Vé không thuộc bãi này", "Vui lòng kiểm tra bãi đỗ trên vé của khách.");
      if (ticket.expiresAt !== undefined && (typeof ticket.expiresAt !== "number" || ticket.expiresAt <= Date.now())) return reject("Vé đã hết hạn", "Vui lòng kiểm tra lại đặt chỗ hoặc liên hệ quản lý bãi.");
      id = ticket.sessionId.toUpperCase();
    } catch { return reject("Mã QR không hợp lệ", "Không đọc được dữ liệu vé. Thử nhập mã thủ công."); }
  }
  const session = lot.sessions.find(s => s.id.toUpperCase() === id);
  if (!session) return reject("Không tìm thấy vé", "Mã đặt chỗ không có trong dữ liệu của bãi đang chọn.");
  if (mode === "in" && paused) return reject("Bãi đang tạm ngưng", "Bãi chưa thể tiếp nhận thêm xe vào.");
  if (session.status === "cancelled" || session.status === "completed") return reject("Vé không còn hiệu lực", "Vé đã hủy hoặc phiên đỗ đã kết thúc. Không thể sử dụng lại.");
  if (mode === "in" && session.status === "parked") return reject("Xe đã check-in", "Xe đang đỗ tại bãi. Chuyển sang cổng ra để check-out.");
  if (mode === "out" && session.status !== "parked") return reject("Xe chưa check-in", "Chỉ cho phép check-out với xe đang đỗ tại bãi.");
  const expected = mode === "in" ? "holding" : "occupied";
  if (!lot.slots.some(s => s.id === session.slotId && s.state === expected)) return reject("Trạng thái ô đỗ đã thay đổi", "Kiểm tra lại phiên đỗ trước khi mở cổng.");
  const total = mode === "out" ? Math.max(session.amount, 80000) : 0;
  return { status: "valid", title: mode === "in" ? "VÉ HỢP LỆ — MỜI XE VÀO" : "XÁC NHẬN XE RA", message: mode === "in" ? "Thông tin đặt chỗ đã được đối chiếu. Xác nhận để ghi nhận xe vào." : "Kiểm tra quyết toán và xác nhận cho xe rời bãi.", session, mode, lotId: lot.id, total, due: Math.max(0, total - session.deposit) };
}
