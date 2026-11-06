import type { OverviewLot, OverviewSlot, VehicleKind } from "./overview-model";

export type LotStatus = "active" | "pending" | "rejected" | "paused";
export type ManagedLot = {
  id: string; code: string; name: string; address: string; area: string; capacity: number;
  opens: string; closes: string; allDay: boolean; vehicles: VehicleKind[]; status: LotStatus;
  cover: string; rejectionReason?: string; submittedAt?: string;
};
export type LotInput = Pick<ManagedLot, "name" | "address" | "area" | "capacity" | "opens" | "closes" | "allDay" | "vehicles" | "cover">;
export const lotStatusLabels: Record<LotStatus, string> = { active: "Đang hoạt động", pending: "Chờ duyệt", rejected: "Bị từ chối", paused: "Tạm ngưng" };
export const defaultCover = "/figma/parking-placeholder.png";

export function initialManagedLots(): ManagedLot[] {
  return [
    { id: "hai-chau-1", code: "EZ-HC01", name: "Bãi Hải Châu 1", address: "72 Lê Thánh Tôn, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh", area: "HẦM B1 & B2", capacity: 120, opens: "06:00", closes: "22:00", allDay: false, vehicles: ["sedan", "suv", "ev"], status: "active", cover: defaultCover },
    { id: "vincom", code: "EZ-VC02", name: "Bãi Hầm Vincom Center", address: "45A Lý Tự Trọng & Đồng Khởi, Bến Nghé, Quận 1, TP. Hồ Chí Minh", area: "HẦM B3", capacity: 250, opens: "00:00", closes: "23:59", allDay: true, vehicles: ["sedan", "suv"], status: "pending", cover: defaultCover, submittedAt: "14:20 – 24/10/2024" },
    { id: "ben-thanh", code: "EZ-BT03", name: "Bãi Xe Chợ Bến Thành B2", address: "Phan Chu Trinh, P. Bến Thành, Quận 1, TP. Hồ Chí Minh", area: "TẦNG -02", capacity: 90, opens: "07:00", closes: "22:00", allDay: false, vehicles: ["sedan", "suv"], status: "rejected", cover: defaultCover, rejectionReason: "Thiếu ảnh chụp góc camera lối vào cổng barrier và sơ đồ thoát hiểm PCCC chưa được cập nhật mộc đỏ thẩm duyệt." },
    { id: "nguyen-hue", code: "EZ-NH04", name: "Bãi Xe Nguyễn Huệ B1", address: "Đường Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh", area: "TẦNG -01", capacity: 80, opens: "08:00", closes: "22:00", allDay: false, vehicles: ["sedan"], status: "paused", cover: defaultCover },
  ];
}

export function validateLotInput(input: LotInput, existing: ManagedLot[], editingId?: string, occupiedAndHeld = 0): LotInput {
  const cleaned = { ...input, name: input.name.trim(), address: input.address.trim(), area: input.area.trim(), vehicles: [...new Set(input.vehicles)] };
  if (!cleaned.name || !cleaned.address || !cleaned.area) throw new Error("Vui lòng nhập tên bãi, địa chỉ và khu vực / tầng.");
  if (existing.some(lot => lot.id !== editingId && lot.name.toLocaleLowerCase("vi") === cleaned.name.toLocaleLowerCase("vi"))) throw new Error("Tên bãi đã tồn tại. Vui lòng chọn tên khác.");
  if (!Number.isInteger(cleaned.capacity) || cleaned.capacity < 1 || cleaned.capacity > 5000) throw new Error("Sức chứa phải là số nguyên từ 1 đến 5.000 chỗ.");
  if (cleaned.capacity < occupiedAndHeld) throw new Error(`Bãi còn ${occupiedAndHeld} ô đang đỗ hoặc giữ chỗ. Không thể giảm sức chứa dưới mức này.`);
  if (!cleaned.vehicles.length || cleaned.vehicles.some(kind => !["sedan", "suv", "ev"].includes(kind))) throw new Error("Chọn ít nhất một loại phương tiện được tiếp nhận.");
  if (!cleaned.allDay && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cleaned.opens) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(cleaned.closes) || cleaned.opens === cleaned.closes)) throw new Error("Nhập giờ mở / đóng hợp lệ và khác nhau, hoặc chọn mở cửa 24/7.");
  return cleaned;
}

export function updateLotProfile(lot: ManagedLot, input: LotInput, resubmit = false): ManagedLot {
  if (lot.status === "pending") throw new Error("Hồ sơ đang chờ duyệt. Vui lòng đợi kết quả xét duyệt.");
  if (resubmit && lot.status !== "rejected") throw new Error("Chỉ gửi lại hồ sơ đã bị từ chối.");
  if (lot.status === "rejected" && !resubmit) throw new Error("Vui lòng chỉnh sửa và gửi lại hồ sơ để được xét duyệt.");
  return { ...lot, ...input, status: resubmit ? "pending" : lot.status, rejectionReason: resubmit ? undefined : lot.rejectionReason, submittedAt: resubmit ? "Vừa gửi lại" : lot.submittedAt };
}

export function changeLotStatus(lot: ManagedLot, action: "pause" | "resume"): ManagedLot {
  if ((action === "pause" && lot.status !== "active") || (action === "resume" && lot.status !== "paused")) throw new Error("Trạng thái bãi không cho phép thao tác này. Hồ sơ chờ duyệt hoặc bị từ chối không thể tự kích hoạt.");
  return { ...lot, status: action === "pause" ? "paused" : "active" };
}

export function syncOverviewProfile(overview: OverviewLot | undefined, profile: ManagedLot): OverviewLot {
  if (!overview) {
    const a = Math.ceil(profile.capacity * .4), b = Math.floor(profile.capacity * .3), c = profile.capacity - a - b;
    const slots = ([['A', a], ['B', b], ['C', c]] as const).flatMap(([zone, count]) => Array.from({ length: count }, (_, i): OverviewSlot => ({ id: `${zone}-${String(i + 1).padStart(2, '0')}`, zone, state: "available" })));
    return { id: profile.id, name: profile.name, location: profile.address, capacityNote: "Ô bảo trì không tính vào sức chứa đang khai thác.", slots, sessions: [], collected: 0 };
  }
  let slots = [...overview.slots];
  let difference = profile.capacity - slots.filter(s => s.state !== "locked").length;
  const busy = slots.filter(s => ["holding", "occupied"].includes(s.state)).length;
  if (profile.capacity < busy) throw new Error("Không thể bỏ ô đang đỗ hoặc giữ chỗ.");
  if (difference < 0) {
    const removable = new Set(slots.filter(s => s.state === "available").reverse().slice(0, -difference).map(s => s.id));
    slots = slots.filter(s => !removable.has(s.id));
  } else {
    let next = Math.max(0, ...slots.filter(s => s.zone === "C").map(s => Number(s.id.split('-')[1]))) + 1;
    while (difference-- > 0) slots.push({ id: `C-${String(next++).padStart(2, '0')}`, zone: "C", state: "available" });
  }
  return { ...overview, name: profile.name, location: profile.address, slots };
}
