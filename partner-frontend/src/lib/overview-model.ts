export type SlotState = "available" | "holding" | "occupied" | "locked";
export type SessionStatus = "holding" | "confirmed" | "parked" | "completed" | "cancelled";
export type VehicleKind = "sedan" | "suv" | "ev";
export type OverviewSlot = { id: string; zone: "A" | "B" | "C"; state: SlotState };
export type ParkingSession = {
  id: string; customer: string; phone: string; plate: string; vehicle: VehicleKind;
  slotId: string; status: SessionStatus; time: string; timeDetail: string;
  deposit: number; amount: number; reason?: string;
  completedAt?: string; overtimeFee?: number;
};
export type OverviewLot = {
  id: string; name: string; location: string; capacityNote: string;
  slots: OverviewSlot[]; sessions: ParkingSession[]; collected: number;
};
export const statusLabels: Record<SessionStatus, string> = {
  holding: "Đang giữ chỗ", confirmed: "Đã xác nhận", parked: "Đang đỗ", completed: "Đã rời bãi", cancelled: "Đã hủy",
};
export const vehicleLabels: Record<VehicleKind, string> = { sedan: "Sedan 4 chỗ", suv: "SUV 7 chỗ", ev: "EV 4 chỗ" };
export const slotLabels: Record<SlotState, string> = { available: "Trống", holding: "Đang giữ", occupied: "Đang đỗ", locked: "Khóa / Bảo trì" };
export const money = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

const sampleNames = ["Nguyễn Hoàng Nam", "Trần Ngọc Anh", "Phan Thanh Bình", "Đặng Thùy Dương", "Lê Anh Tuấn", "Võ Minh Khang"];

export function createDemoLot(id = "hai-chau-1"): OverviewLot {
  const vincom = id === "vincom";
  const zoneTargets = vincom ? [{ zone: "A", total: 32, parked: 20, holding: 4 }, { zone: "B", total: 24, parked: 14, holding: 3 }, { zone: "C", total: 24, parked: 16, holding: 3 }] : [{ zone: "A", total: 48, parked: 28, holding: 7 }, { zone: "B", total: 36, parked: 14, holding: 6 }, { zone: "C", total: 36, parked: 18, holding: 5 }];
  const slots: OverviewSlot[] = [];
  for (const target of zoneTargets) {
    const zone = target.zone as OverviewSlot["zone"];
    const zoneSlots: OverviewSlot[] = Array.from({ length: target.total + (zone === "A" ? 1 : 0) }, (_, i) => ({ id: `${zone}-${String(i + 1).padStart(2, "0")}`, zone, state: "available" }));
    if (zone === "A") {
      for (const s of zoneSlots) {
        if (["A-03", "A-05", "A-08", "A-11"].includes(s.id)) s.state = "occupied";
        if (["A-02", "A-07"].includes(s.id)) s.state = "holding";
        if (s.id === "A-09") s.state = "locked";
      }
    } else if (zone === "B") zoneSlots.find(s => s.id === "B-03")!.state = "occupied";
    let parked = zoneSlots.filter(s => s.state === "occupied").length;
    let holding = zoneSlots.filter(s => s.state === "holding").length;
    // Keep the first 12 cells as the reference's representative zone A grid.
    const remaining = [...zoneSlots.filter(s => Number(s.id.split("-")[1]) > 12), ...zoneSlots.filter(s => Number(s.id.split("-")[1]) <= 12)];
    for (const slot of remaining) {
      if (slot.state !== "available") continue;
      if (parked < target.parked) { slot.state = "occupied"; parked++; }
      else if (holding < target.holding) { slot.state = "holding"; holding++; }
    }
    slots.push(...zoneSlots);
  }
  const sessions: ParkingSession[] = [
    { id: "EZ-8921", customer: "Nguyễn Văn Hùng", phone: "0905 *** 122", plate: "43A-123.45", vehicle: "sedan", slotId: "A-07", status: "holding", time: "16:48", timeDetail: "Còn 12 phút", deposit: 50000, amount: 50000 },
    { id: "EZ-8919", customer: "Trần Minh Quang", phone: "0913 *** 984", plate: "51K-982.14", vehicle: "suv", slotId: "B-03", status: "parked", time: "Vào: 15:20", timeDetail: "Đã đỗ 1h 28p", deposit: 50000, amount: 45000 },
    { id: "EZ-8915", customer: "Lê Hoàng Yến", phone: "0982 *** 551", plate: "29A-876.54", vehicle: "ev", slotId: "A-02", status: "confirmed", time: "Hẹn: 17:15", timeDetail: "Cách 39 phút", deposit: 50000, amount: 50000 },
    { id: "EZ-8910", customer: "Phạm Quốc Bảo", phone: "0977 *** 410", plate: "43C-554.12", vehicle: "suv", slotId: "C-11", status: "completed", time: "Rời lúc 16:10", timeDetail: "Tổng gửi: 2h 40p", deposit: 50000, amount: 80000 },
    { id: "EZ-8904", customer: "Võ Thị Mai", phone: "0934 *** 671", plate: "43A-332.90", vehicle: "sedan", slotId: "A-09", status: "cancelled", time: "Khách hủy trước 10p", timeDetail: "Hoàn 100% cọc", deposit: 50000, amount: 0, reason: "Khách hàng thay đổi lịch trình" },
  ];
  let sequence = 0;
  for (const slot of slots) {
    if (!["occupied", "holding"].includes(slot.state) || sessions.some(s => s.slotId === slot.id && ["holding", "confirmed", "parked"].includes(s.status))) continue;
    sessions.push({ id: `EZ-${8800 - sequence}`, customer: sampleNames[sequence % sampleNames.length], phone: "0905 *** 678", plate: `43A-${String(200 + sequence).padStart(3, "0")}.${String(sequence % 100).padStart(2, "0")}`, vehicle: (["sedan", "suv", "ev"] as VehicleKind[])[sequence % 3], slotId: slot.id, status: slot.state === "holding" ? "holding" : "parked", time: slot.state === "holding" ? "16:42" : "Vào: 14:30", timeDetail: slot.state === "holding" ? "Còn 6 phút" : "Đang đỗ tại bãi", deposit: 50000, amount: slot.state === "holding" ? 50000 : 40000 });
    sequence++;
  }
  for (let i = 0; i < 140; i++) sessions.push({ id: `EZ-${7500 - i}`, customer: sampleNames[i % sampleNames.length], phone: "0912 *** 345", plate: `92A-${String(300 + i)}.${String(i % 100).padStart(2, "0")}`, vehicle: i % 2 ? "suv" : "sedan", slotId: `B-${String(i % 36 + 1).padStart(2, "0")}`, status: "completed", time: "Hôm qua, 16:10", timeDetail: "Phiên đỗ đã kết thúc", deposit: 50000, amount: 60000 });
  return { id, name: vincom ? "Bãi Hầm Vincom Center" : "Bãi Hải Châu 1", location: vincom ? "910A Ngô Quyền, Sơn Trà, Đà Nẵng" : "15 Lê Duẩn, Hải Châu, Đà Nẵng", capacityNote: "Ô bảo trì không tính vào sức chứa đang khai thác.", slots, sessions, collected: vincom ? 3250000 : 4850000 };
}

export function summarizeLot(lot: OverviewLot) {
  const available = lot.slots.filter(s => s.state === "available").length;
  const holding = lot.slots.filter(s => s.state === "holding").length;
  const occupied = lot.slots.filter(s => s.state === "occupied").length;
  return { capacity: available + holding + occupied, available, holding, occupied, locked: lot.slots.filter(s => s.state === "locked").length, deposits: lot.sessions.filter(s => s.status === "holding" || s.status === "confirmed").reduce((total, s) => total + s.deposit, 0) };
}

export function activeSessionForSlot(lot: OverviewLot, slotId: string) {
  return lot.sessions.find(s => s.slotId === slotId && ["holding", "confirmed", "parked"].includes(s.status));
}

export function transitionSession(lot: OverviewLot, id: string, action: "checkin" | "checkout" | "cancel", reason = ""): OverviewLot {
  const session = lot.sessions.find(s => s.id === id);
  if (!session) throw new Error("Không tìm thấy phiên đỗ.");
  const expected = action === "checkout" ? ["parked"] : ["holding", "confirmed"];
  if (!expected.includes(session.status)) throw new Error("Trạng thái phiên đỗ không cho phép thao tác này.");
  const slot = lot.slots.find(s => s.id === session.slotId);
  if (!slot || slot.state !== (action === "checkout" ? "occupied" : "holding")) throw new Error("Trạng thái ô đỗ đã thay đổi. Vui lòng kiểm tra lại.");
  if (action === "cancel" && !reason.trim()) throw new Error("Vui lòng nhập lý do hủy đặt chỗ.");
  const status: SessionStatus = action === "checkin" ? "parked" : action === "checkout" ? "completed" : "cancelled";
  const state: SlotState = action === "checkin" ? "occupied" : "available";
  return { ...lot, slots: lot.slots.map(s => s.id === slot.id ? { ...s, state } : s), sessions: lot.sessions.map(s => s.id === id ? { ...s, status, completedAt: action === "checkout" ? new Date().toISOString() : s.completedAt, time: action === "checkin" ? "Vừa nhận xe" : action === "checkout" ? "Vừa rời bãi" : "Vừa hủy đặt chỗ", timeDetail: action === "checkin" ? "Bắt đầu phiên đỗ mẫu" : action === "checkout" ? "Đã quyết toán mẫu" : "Đã giải phóng ô đỗ", amount: action === "checkout" ? Math.max(s.amount, 80000) : action === "cancel" ? 0 : s.amount, reason: reason.trim() || s.reason } : s), collected: lot.collected + (action === "checkout" ? Math.max(session.amount, 80000) : 0) };
}

export function setSlotLock(lot: OverviewLot, id: string, locked: boolean): OverviewLot {
  const slot = lot.slots.find(s => s.id === id);
  if (!slot || !["available", "locked"].includes(slot.state)) throw new Error("Chỉ có thể khóa ô trống hoặc mở ô đang bảo trì.");
  return { ...lot, slots: lot.slots.map(s => s.id === id ? { ...s, state: locked ? "locked" : "available" } : s) };
}

export function registerWalkIn(lot: OverviewLot, input: { customer: string; plate: string; vehicle: VehicleKind; slotId: string }): OverviewLot {
  const customer = input.customer.trim();
  const plate = input.plate.trim().toUpperCase();
  if (!customer || !/^\d{2}[A-Z]{1,2}-\d{3}\.\d{2}$/.test(plate)) throw new Error("Nhập tên khách và biển số đúng mẫu 43A-123.45.");
  if (!lot.slots.some(s => s.id === input.slotId && s.state === "available")) throw new Error("Ô đã chọn không còn trống.");
  if (lot.sessions.some(s => s.plate === plate && ["holding", "confirmed", "parked"].includes(s.status))) throw new Error("Xe này đã có phiên đỗ hoặc đang giữ chỗ.");
  const session: ParkingSession = { ...input, customer, plate, id: `EZ-VL-${lot.sessions.length + 1}`, phone: "Khách vãng lai", status: "parked", time: "Vừa vào bãi", timeDetail: "Khách vãng lai", deposit: 0, amount: 0 };
  return { ...lot, slots: lot.slots.map(s => s.id === input.slotId ? { ...s, state: "occupied" } : s), sessions: [session, ...lot.sessions] };
}
