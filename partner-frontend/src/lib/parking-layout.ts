import type { OverviewLot, VehicleKind } from "./overview-model";

export const floors = [{ id: "b1", name: "Tầng Hầm B1" }, { id: "ground", name: "Tầng Trệt Khu A" }, { id: "mezzanine", name: "Tầng Lửng Khu B" }] as const;
export type FloorId = typeof floors[number]["id"];
export type LayoutCell = { slotId: string; code: string; floor: FloorId; row: number; col: number; vehicle: VehicleKind; locked: boolean };
export type LayoutRoad = { id: string; floor: FloorId; afterRow: number; direction: "left" | "right" };
export type LayoutGate = { id: string; floor: FloorId; type: "entrance" | "exit"; col: number };
export type ParkingLayout = { cells: LayoutCell[]; roads: LayoutRoad[]; gates: LayoutGate[]; savedAt?: string };
export const ROWS = 10;
export const COLS = 12;
const busy = (lot: OverviewLot, id: string) => lot.slots.some(s => s.id === id && ["holding", "occupied"].includes(s.state));

export function createParkingLayout(lot: OverviewLot, allowed: VehicleKind[] = ["sedan", "suv", "ev"]): ParkingLayout {
  // Keep every active reservation/vehicle represented. Remaining spaces are an unplaced pool.
  const required = lot.slots.filter(s => s.state !== "available");
  const target = Math.max(required.length, Math.min(96, lot.slots.length));
  const ids = new Set([...required, ...lot.slots.filter(s => s.state === "available").slice(0, target - required.length)].map(s => s.id));
  const ordered = [...lot.slots.filter(s => Number(s.id.split('-')[1]) <= 12), ...lot.slots.filter(s => Number(s.id.split('-')[1]) > 12)].filter(s => ids.has(s.id));
  return {
    cells: ordered.map((slot, i) => ({ slotId: slot.id, code: slot.id, floor: "b1", row: Math.floor(i / COLS), col: i % COLS, vehicle: lot.sessions.find(s => s.slotId === slot.id && ["holding", "confirmed", "parked"].includes(s.status))?.vehicle ?? allowed[i % allowed.length] ?? "sedan", locked: slot.state === "locked" })),
    roads: [{ id: "lane-1", floor: "b1", afterRow: 1, direction: "right" }, { id: "lane-2", floor: "b1", afterRow: 3, direction: "left" }],
    gates: [{ id: "entrance-b1", floor: "b1", type: "entrance", col: 0 }, { id: "exit-b1", floor: "b1", type: "exit", col: 9 }],
  };
}

export function validateParkingLayout(layout: ParkingLayout, lot: OverviewLot, capacity: number, allowed: VehicleKind[]) {
  if (layout.cells.length > capacity) throw new Error(`Sơ đồ có ${layout.cells.length} ô, vượt sức chứa khai báo ${capacity}.`);
  const ids = new Set<string>(), codes = new Set<string>(), positions = new Set<string>();
  for (const cell of layout.cells) {
    if (!lot.slots.some(s => s.id === cell.slotId)) throw new Error(`Ô ${cell.code} không còn tồn tại trong bãi. Hãy tải lại bản đã lưu.`);
    if (!/^[A-Z][A-Z0-9]*-\d{2,4}$/.test(cell.code)) throw new Error("Mã ô phải theo mẫu A-01, gồm chữ và 2–4 chữ số.");
    if (ids.has(cell.slotId) || codes.has(cell.code)) throw new Error(`Mã ô ${cell.code} bị trùng.`);
    if (lot.slots.some(s => s.id === cell.code && s.id !== cell.slotId)) throw new Error(`Mã ${cell.code} đã được dùng bởi ô khác trong bãi.`);
    ids.add(cell.slotId); codes.add(cell.code);
    if (!floors.some(f => f.id === cell.floor) || !Number.isInteger(cell.row) || cell.row < 0 || cell.row >= ROWS || !Number.isInteger(cell.col) || cell.col < 0 || cell.col >= COLS) throw new Error("Vị trí ô nằm ngoài phạm vi sơ đồ.");
    const position = `${cell.floor}:${cell.row}:${cell.col}`;
    if (positions.has(position)) throw new Error("Hai ô đang chồng lên nhau. Hãy chọn vị trí trống.");
    positions.add(position);
    if (!allowed.includes(cell.vehicle)) throw new Error("Loại xe của ô chưa được khai báo trong hồ sơ bãi.");
    if (busy(lot, cell.slotId) && (cell.code !== cell.slotId || cell.locked)) throw new Error(`Ô ${cell.slotId} đang đỗ/giữ chỗ, không thể đổi mã hoặc khóa.`);
  }
  if (lot.slots.some(s => busy(lot, s.id) && !ids.has(s.id))) throw new Error("Sơ đồ phải giữ lại mọi ô đang có xe hoặc đặt chỗ.");
  const roadPositions = new Set<string>();
  for (const road of layout.roads) {
    const key = `${road.floor}:${road.afterRow}`;
    if (roadPositions.has(key) || !floors.some(f => f.id === road.floor) || !Number.isInteger(road.afterRow) || road.afterRow < 0 || road.afterRow >= ROWS || !["left", "right"].includes(road.direction)) throw new Error("Làn xe không hợp lệ hoặc bị trùng.");
    roadPositions.add(key);
  }
  for (const gate of layout.gates) if (!floors.some(f => f.id === gate.floor) || !Number.isInteger(gate.col) || gate.col < 0 || gate.col >= COLS || !["entrance", "exit"].includes(gate.type)) throw new Error("Vị trí cổng không hợp lệ.");
}

export function removeLayoutCells(layout: ParkingLayout, ids: string[], lot: OverviewLot): ParkingLayout {
  if (ids.some(id => busy(lot, id))) throw new Error("Không thể xóa ô đang có xe hoặc giữ chỗ. Hãy kết thúc phiên đỗ trước.");
  return { ...layout, cells: layout.cells.filter(c => !ids.includes(c.slotId)) };
}

export function placeLayoutCell(layout: ParkingLayout, lot: OverviewLot, capacity: number, floor: FloorId, row: number, col: number, vehicle: VehicleKind = "sedan"): ParkingLayout {
  if (layout.cells.length >= capacity) throw new Error("Đã đủ sức chứa khai báo. Hãy cập nhật hồ sơ bãi trước khi thêm ô.");
  if (layout.cells.some(c => c.floor === floor && c.row === row && c.col === col)) throw new Error("Vị trí này đã có ô đỗ.");
  const slot = lot.slots.find(s => !layout.cells.some(c => c.slotId === s.id) && s.state === "available");
  if (!slot) throw new Error("Không còn ô trống chưa bố trí trong bãi.");
  return { ...layout, cells: [...layout.cells, { slotId: slot.id, code: slot.id, floor, row, col, vehicle, locked: false }] };
}

export function moveLayoutCells(layout: ParkingLayout, ids: string[], floor: FloorId, rowDelta: number, colDelta: number): ParkingLayout {
  const next = { ...layout, cells: layout.cells.map(c => ids.includes(c.slotId) ? { ...c, floor, row: c.row + rowDelta, col: c.col + colDelta } : c) };
  const positions = new Set<string>();
  for (const cell of next.cells) {
    const key = `${cell.floor}:${cell.row}:${cell.col}`;
    if (cell.row < 0 || cell.row >= ROWS || cell.col < 0 || cell.col >= COLS || positions.has(key)) throw new Error("Vị trí di chuyển bị trùng hoặc nằm ngoài sơ đồ.");
    positions.add(key);
  }
  return next;
}

export function publishParkingLayout(layout: ParkingLayout, lot: OverviewLot, capacity: number, allowed: VehicleKind[]) {
  validateParkingLayout(layout, lot, capacity, allowed);
  const nextLot: OverviewLot = { ...lot, slots: lot.slots.map(slot => {
    const cell = layout.cells.find(c => c.slotId === slot.id);
    return cell ? { ...slot, id: cell.code, state: ["available", "locked"].includes(slot.state) ? cell.locked ? "locked" : "available" : slot.state } : slot;
  }) };
  return { lot: nextLot, layout: { ...layout, cells: layout.cells.map(c => ({ ...c, slotId: c.code })), savedAt: new Date().toISOString() } };
}

export function trimLayoutToInventory(layout: ParkingLayout, lot: OverviewLot, capacity: number): ParkingLayout {
  let cells = layout.cells.filter(cell => lot.slots.some(slot => slot.id === cell.slotId));
  const excess = Math.max(0, cells.length - capacity);
  const removable = new Set(cells.filter(cell => !busy(lot, cell.slotId)).reverse().slice(0, excess).map(cell => cell.slotId));
  cells = cells.filter(cell => !removable.has(cell.slotId));
  return { ...layout, cells };
}
