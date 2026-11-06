"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { clsx } from "clsx";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Car, Check, CheckCircle2, CircleCheck, Clock3, Copy, DoorClosed, Eraser, Expand, Grid2X2, Hand, Hash, Info, Keyboard, LockKeyhole, Minus, MousePointer2, Pencil, Plus, Redo2, Save, SlidersHorizontal, SquareParking, Trash2, TriangleAlert, Undo2, X, Zap } from "lucide-react";
import { activeSessionForSlot, slotLabels, type VehicleKind } from "@/lib/overview-model";
import { COLS, ROWS, createParkingLayout, floors, moveLayoutCells, placeLayoutCell, removeLayoutCells, validateParkingLayout, type FloorId, type LayoutCell, type ParkingLayout } from "@/lib/parking-layout";
import { usePartnerWorkspace } from "./PartnerWorkspace";
import { PartnerHeader, PartnerSidebar } from "./PartnerNavigation";
import { PartnerButton, PartnerKpi, PartnerBadge } from "./PartnerUI";
import PartnerDialog from "./PartnerDialog";
import shell from "./overview.module.css";
import tokens from "./partner.module.css";
import styles from "./layout-editor.module.css";

type Tool = "select" | "add" | "road" | "erase" | "entrance" | "exit" | "pan";
type Modal = "save" | "generate" | "delete" | "reset" | "help" | "info" | null;
const tools = [{ id: "select", label: "Chọn", Icon: MousePointer2 }, { id: "add", label: "Thêm ô", Icon: SquareParking }, { id: "road", label: "Vẽ đường", Icon: Hash }, { id: "erase", label: "Xóa", Icon: Eraser }, { id: "entrance", label: "Lối vào", Icon: DoorClosed }, { id: "exit", label: "Đi cửa ra", Icon: DoorClosed }, { id: "pan", label: "Di chuyển", Icon: Hand }] as const;
const vehicleNames: Record<VehicleKind, string> = { sedan: "Sedan 4 chỗ", suv: "SUV 7 chỗ", ev: "Xe điện EV" };
const floorName = (id: FloorId) => floors.find(f => f.id === id)!.name;
const rowName = (row: number) => String.fromCharCode(65 + row);
const cleanError = (error: unknown) => error instanceof Error ? error.message : "Không thể thực hiện thao tác này.";

export default function PartnerLayoutEditor() {
  const { selectedId } = usePartnerWorkspace();
  return <Editor key={selectedId} />;
}

function Editor() {
  const { catalog, selectedId, selectLot, overviews, layouts, layoutDrafts, setLayoutDrafts, saveLayout } = usePartnerWorkspace();
  const lot = overviews[selectedId];
  const profile = catalog.find(l => l.id === selectedId)!;
  const initial = useRef(createParkingLayout(lot, profile.vehicles));
  const baseline = layouts[selectedId] ?? initial.current;
  const [draft, setDraft] = useState<ParkingLayout>(() => layoutDrafts[selectedId] ?? baseline);
  const [past, setPast] = useState<ParkingLayout[]>([]), [future, setFuture] = useState<ParkingLayout[]>([]);
  const [selected, setSelected] = useState<string[]>(() => draft.cells.some(c => c.slotId === "A-07") ? ["A-07"] : []);
  const [properties, setProperties] = useState(false), [live, setLive] = useState(false);
  const [floor, setFloor] = useState<FloorId>("b1"), [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(100), [snap, setSnap] = useState(true);
  const [collapsed, setCollapsed] = useState(false), [navOpen, setNavOpen] = useState(false), [compact, setCompact] = useState(false);
  const [modal, setModal] = useState<Modal>(null), [info, setInfo] = useState({ title: "", message: "" });
  const [error, setError] = useState(""), [toast, setToast] = useState("");
  const [autoRows, setAutoRows] = useState(2), [autoCols, setAutoCols] = useState(12), [autoStart, setAutoStart] = useState(9);
  const [autoVehicle, setAutoVehicle] = useState<VehicleKind>(profile.vehicles[0]);
  const [code, setCode] = useState("");
  const viewport = useRef<HTMLDivElement>(null), propertiesPanel = useRef<HTMLElement>(null);
  const dragged = useRef<string | null>(null), pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const view = live ? baseline : draft;
  const cells = view.cells.filter(c => c.floor === floor);
  const picked = view.cells.filter(c => selected.includes(c.slotId));
  const single = picked.length === 1 ? picked[0] : undefined;
  const currentSlot = single && lot.slots.find(s => s.id === single.slotId);
  const session = single && activeSessionForSlot(lot, single.slotId);
  const protectedSelection = picked.some(c => lot.slots.some(s => s.id === c.slotId && ["occupied", "holding"].includes(s.state)));
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const missing = Math.max(0, profile.capacity - view.cells.length);
  const lockedCount = view.cells.filter(c => live ? lot.slots.some(s => s.id === c.slotId && s.state === "locked") : c.locked).length;
  const roads = view.roads.filter(r => r.floor === floor);
  const canEdit = !live;

  useEffect(() => { setLayoutDrafts(value => ({ ...value, [selectedId]: draft })); }, [draft, selectedId, setLayoutDrafts]);
  useEffect(() => { setCode(single?.code ?? ""); }, [single?.slotId, single?.code]);
  useEffect(() => { if (properties && window.matchMedia("(max-width: 1150px)").matches) propertiesPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [properties, single?.slotId]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function apply(next: ParkingLayout) {
    if (live) return;
    setPast(value => [...value.slice(-39), draft]); setFuture([]); setDraft(next); setError("");
  }
  function attempt(action: () => void) { try { action(); setError(""); } catch (e) { setError(cleanError(e)); } }
  function undo() { if (!past.length || live) return; setFuture(value => [draft, ...value]); setDraft(past[past.length - 1]); setPast(value => value.slice(0, -1)); setError(""); }
  function redo() { if (!future.length || live) return; setPast(value => [...value, draft]); setDraft(future[0]); setFuture(value => value.slice(1)); setError(""); }
  function showInfo(title: string, message = "Mục này chưa được triển khai trong bốn frame hiện tại.") { setInfo({ title, message }); setModal("info"); }
  function chooseFloor(value: FloorId) { setFloor(value); setSelected([]); setProperties(false); setError(""); }
  function selectCell(cell: LayoutCell, multi = false) {
    if (tool === "erase" && canEdit) { attempt(() => apply(removeLayoutCells(draft, [cell.slotId], lot))); return; }
    if (tool === "road" || tool === "entrance" || tool === "exit") { if (canEdit) editPosition(cell.row, cell.col); return; }
    if (tool === "add" && canEdit) { setError("Vị trí này đã có ô đỗ. Chọn một ô lưới nét đứt còn trống."); return; }
    if (tool === "pan") return;
    setSelected(value => multi ? value.includes(cell.slotId) ? value.filter(id => id !== cell.slotId) : [...value, cell.slotId] : [cell.slotId]);
    setProperties(true); setError("");
  }
  function editPosition(row: number, col: number) {
    if (!canEdit) return;
    attempt(() => {
      if (tool === "add") {
        const next = placeLayoutCell(draft, lot, profile.capacity, floor, row, col, profile.vehicles[0]);
        apply(next); setSelected([next.cells[next.cells.length - 1].slotId]); setProperties(true);
      } else if (tool === "road") {
        const road = draft.roads.find(r => r.floor === floor && r.afterRow === row);
        apply({ ...draft, roads: road ? draft.roads.map(r => r.id === road.id ? { ...r, direction: r.direction === "left" ? "right" : "left" } : r) : [...draft.roads, { id: `lane-${floor}-${row}`, floor, afterRow: row, direction: "right" }] });
      } else if (tool === "entrance" || tool === "exit") {
        apply({ ...draft, gates: [...draft.gates.filter(g => !(g.floor === floor && g.type === tool)), { id: `${tool}-${floor}`, floor, type: tool, col }] });
      } else { setSelected([]); setProperties(false); }
    });
  }
  function moveSelected(rowDelta: number, colDelta: number) { if (selected.length && canEdit) attempt(() => apply(moveLayoutCells(draft, selected, floor, rowDelta, colDelta))); }
  function duplicate() {
    if (!picked.length || live) return;
    attempt(() => {
      let next = draft; const added: string[] = [];
      for (const cell of picked) {
        const position = Array.from({ length: ROWS * COLS }, (_, i) => ({ row: Math.floor(i / COLS), col: i % COLS })).find(p => !next.cells.some(c => c.floor === floor && c.row === p.row && c.col === p.col));
        if (!position) throw new Error("Tầng hiện tại không còn vị trí trống.");
        next = placeLayoutCell(next, lot, profile.capacity, floor, position.row, position.col, cell.vehicle);
        added.push(next.cells[next.cells.length - 1].slotId);
      }
      apply(next); setSelected(added); setProperties(true);
    });
  }
  function patchSelected(patch: Partial<Pick<LayoutCell, "code" | "vehicle" | "locked">>) {
    attempt(() => {
      if (protectedSelection) throw new Error("Ô đang đỗ hoặc giữ chỗ chỉ có thể xem thông tin và điều chỉnh vị trí.");
      const next = { ...draft, cells: draft.cells.map(c => selected.includes(c.slotId) ? { ...c, ...patch } : c) };
      validateParkingLayout(next, lot, profile.capacity, profile.vehicles); apply(next);
    });
  }
  function onDrop(event: DragEvent, row: number, col: number) {
    event.preventDefault();
    const source = draft.cells.find(c => c.slotId === dragged.current);
    if (!source || live) return;
    const ids = selected.includes(source.slotId) ? selected : [source.slotId];
    attempt(() => { apply(moveLayoutCells(draft, ids, floor, row - source.row, col - source.col)); setSelected(ids); });
    dragged.current = null;
  }
  function generate() {
    attempt(() => {
      if (![autoRows, autoCols, autoStart].every(Number.isInteger) || autoRows < 1 || autoCols < 1 || autoCols > COLS || autoStart < 1 || autoStart + autoRows - 1 > ROWS) throw new Error("Chọn số hàng, cột và hàng bắt đầu trong phạm vi A–J, 1–12.");
      let next = draft;
      for (let row = autoStart - 1; row < autoStart - 1 + autoRows; row++) for (let col = 0; col < autoCols; col++) next = placeLayoutCell(next, lot, profile.capacity, floor, row, col, autoVehicle);
      validateParkingLayout(next, lot, profile.capacity, profile.vehicles);
      apply(next); setModal(null); setToast(`Đã thêm ${autoRows * autoCols} ô vào bản nháp. Chọn Lưu sơ đồ để áp dụng.`);
    });
  }
  function save() { attempt(() => { const effective = { ...draft, cells: draft.cells.map(cell => ({ ...cell, locked: cell.locked === baseline.cells.find(c => c.slotId === cell.slotId)?.locked ? lot.slots.find(s => s.id === cell.slotId)?.state === "locked" : cell.locked })) }; const saved = saveLayout(selectedId, effective); setDraft(saved); setPast([]); setFuture([]); setSelected([]); setProperties(false); setModal(null); setToast("Đã lưu sơ đồ và đồng bộ trạng thái ô trong phiên xem thử."); }); }

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"],dialog') || modal) return;
      if (event.key === "Escape") { setSelected([]); setProperties(false); setError(""); return; }
      if (live) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); setError(""); setModal("save"); }
      else if (event.key === "Delete" && selected.length) { event.preventDefault(); if (protectedSelection) setError("Không thể xóa ô đang có xe hoặc giữ chỗ."); else setModal("delete"); }
      else if (selected.length && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) { event.preventDefault(); moveSelected(event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0, event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0); }
    }
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  });

  const panel = <aside ref={propertiesPanel} className={styles.properties} aria-label="Thuộc tính ô đỗ"><div className={styles.panelHeading}><div><small>{live ? "THÔNG TIN TRỰC TIẾP" : "THUỘC TÍNH Ô ĐỖ"}</small><h2>{picked.length > 1 ? `${picked.length} ô đang chọn` : single ? `Ô đỗ ${single.code}` : "Chưa chọn ô đỗ"}</h2></div><button type="button" aria-label="Đóng thuộc tính" onClick={() => setProperties(false)}><X size={18} /></button></div>
    {picked.length > 0 ? <><p className={styles.panelIntro}>{floorName(floor)} · {picked.length > 1 ? "Chỉnh sửa đồng thời các ô đã chọn" : "Cấu hình thông tin và trạng thái tiếp nhận"}</p>
      {single && <><label className={styles.field}>Mã định danh ô (Slot ID)<div className={styles.codeInput}><input aria-label="Mã định danh ô" value={code} disabled={live || protectedSelection} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === "Enter") patchSelected({ code: code.trim() }); }} /><button type="button" disabled={live || protectedSelection || code.trim() === single.code} onClick={() => patchSelected({ code: code.trim() })}>Áp dụng</button></div></label><div className={styles.coordinates}><span>Hàng<b>{rowName(single.row)}</b></span><span>Cột<b>{single.col + 1}</b></span></div></>}
      <fieldset className={styles.vehicleOptions} disabled={live || protectedSelection}><legend>Loại xe phù hợp tiếp nhận</legend>{profile.vehicles.map(kind => <label key={kind}><span>{kind === "ev" ? <Zap size={19} /> : <Car size={19} />}<span><b>{vehicleNames[kind]}</b><small>{kind === "ev" ? "Khu vực dành cho xe điện" : kind === "suv" ? "SUV / MPV, tối đa 7 chỗ" : "Xe gầm thấp, tối đa 4 chỗ"}</small></span></span><input type="radio" name="slotVehicle" checked={picked.every(c => c.vehicle === kind)} onChange={() => patchSelected({ vehicle: kind })} /></label>)}</fieldset>
      <label className={styles.lockToggle}><span><b>Cho phép sử dụng ô</b><small>Tắt để khóa / bảo trì ô đỗ</small></span><input type="checkbox" role="switch" aria-label="Cho phép sử dụng ô" checked={picked.every(c => live ? lot.slots.find(s => s.id === c.slotId)?.state !== "locked" : !c.locked)} disabled={live || protectedSelection} onChange={e => patchSelected({ locked: !e.target.checked })} /></label>
      {protectedSelection && <div className={styles.warning}><TriangleAlert size={17} /><p>Ô đang có xe hoặc giữ chỗ. Không thể đổi mã, loại xe, khóa hay xóa cho đến khi phiên đỗ kết thúc.{session && <><br /><b>{session.plate}</b> · {session.customer}</>}</p></div>}
      {currentSlot && <div className={styles.currentState}><span>Trạng thái vận hành</span><PartnerBadge tone={currentSlot.state === "occupied" ? "danger" : currentSlot.state === "holding" ? "warning" : currentSlot.state === "locked" ? "neutral" : "success"}>{slotLabels[currentSlot.state]}</PartnerBadge></div>}
      {!live && <><div className={styles.moveControls}><span>Di chuyển ô đã chọn</span><div><button type="button" aria-label="Di chuyển lên" onClick={() => moveSelected(-1, 0)}><ArrowUp size={15} /></button><button type="button" aria-label="Di chuyển trái" onClick={() => moveSelected(0, -1)}><ArrowLeft size={15} /></button><button type="button" aria-label="Di chuyển xuống" onClick={() => moveSelected(1, 0)}><ArrowDown size={15} /></button><button type="button" aria-label="Di chuyển phải" onClick={() => moveSelected(0, 1)}><ArrowRight size={15} /></button></div></div><label className={styles.field}>Chuyển sang tầng<select aria-label="Chuyển ô sang tầng" value={floor} onChange={e => attempt(() => { apply(moveLayoutCells(draft, selected, e.target.value as FloorId, 0, 0)); chooseFloor(e.target.value as FloorId); })}>{floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label><div className={styles.panelActions}><PartnerButton variant="secondary" onClick={duplicate}><Copy size={14} />Nhân bản</PartnerButton><PartnerButton variant="danger" disabled={protectedSelection} onClick={() => { setError(""); setModal("delete"); }}><Trash2 size={14} />Xóa ô</PartnerButton></div></>}
    </> : <div className={styles.noSelection}><MousePointer2 size={28} /><p>Chọn một ô trên sơ đồ để xem thuộc tính. Giữ Shift để chọn nhiều ô.</p></div>}</aside>;

  return <div className={clsx(tokens.partner, shell.shell, styles.page, compact && shell.compact, compact && styles.compactPage, collapsed && shell.collapsed)}>
    <PartnerSidebar active="layout" open={navOpen} collapsed={collapsed} onClose={() => setNavOpen(false)} onCollapse={() => setCollapsed(v => !v)} onAuxiliary={showInfo} />
    <div className={shell.workspace}><PartnerHeader page="layout" compact={compact} onCompact={setCompact} onMenu={() => setNavOpen(true)} selectedId={selectedId} onSelect={selectLot} lots={catalog.filter(l => ["active", "paused"].includes(l.status))} onNotifications={() => showInfo("Thông báo", "Chưa có thông báo mới. Các trạng thái đang dùng dữ liệu mẫu trong phiên xem thử.")} onProfile={() => showInfo("Tài khoản đối tác", "Minh Trần · Quản lý bãi · Không có thay đổi tài khoản thật trong bản xem thử.")} />
      <section className={styles.content} aria-label="Trình chỉnh sửa sơ đồ">
        <div className={styles.simulator}><span><SlidersHorizontal size={15} />QUICK STATE SIMULATOR:</span><div><button type="button" onClick={() => { setSelected([]); setProperties(false); }}>[Trống/Bỏ chọn]</button><button type="button" onClick={() => { const cell = view.cells.find(c => c.slotId === "A-07") ?? view.cells[0]; if (cell) { setFloor(cell.floor); setSelected([cell.slotId]); setProperties(true); } }}>[1 ô chọn: A-07]</button><button type="button" onClick={() => { setSelected(cells.slice(0, 5).map(c => c.slotId)); setProperties(true); }}>[Nhiều ô (2–5)]</button><button type="button" disabled={live} onClick={() => { setError(""); setModal("generate"); }}>[Tạo lưới tự động]</button><button type="button" disabled={live} onClick={() => { setError(""); setModal("save"); }}>[Lưu sơ đồ (Modal)]</button><button type="button" onClick={() => { setLive(true); setTool("select"); setSelected([]); setProperties(false); }}>[Xem trực tiếp]</button><button type="button" onClick={() => setProperties(true)}>[Drawer chi tiết]</button></div></div>
        <div className={styles.heading}><div><h2>Sơ đồ ô đỗ{dirty && <span>Chưa lưu</span>}</h2><p>Dựng, quản lý tọa độ và đồng bộ thời gian thực trạng thái từng ô đỗ trong phân khu</p></div><div className={styles.actions}><div className={styles.mode}><button type="button" aria-pressed={!live} onClick={() => { setLive(false); setSelected([]); setProperties(false); }}><Pencil size={15} />Chỉnh sửa</button><button type="button" aria-pressed={live} onClick={() => { setLive(true); setTool("select"); setSelected([]); setProperties(false); }}><i />Xem trực tiếp</button></div><PartnerButton variant="secondary" disabled={live || !past.length} onClick={undo}><Undo2 size={14} />Hoàn tác</PartnerButton><PartnerButton disabled={live} onClick={() => { setError(""); setModal("save"); }}><Save size={15} />Lưu sơ đồ</PartnerButton></div></div>
        <div className={styles.kpis}><PartnerKpi label="Sức chứa khai báo" value={String(profile.capacity)} unit="chỗ" tone="info" icon={<SquareParking size={18} />} footnote="Hồ sơ đối tác đã đăng ký" /><PartnerKpi label="Số ô đã dựng" value={String(view.cells.length)} unit={`/ ${profile.capacity} ô`} tone="info" icon={<CircleCheck size={18} />} footnote={`${cells.length} ô tại ${floorName(floor)}`} /><PartnerKpi label="Còn thiếu" value={String(missing)} unit="ô chưa định vị" tone={missing ? "warning" : "success"} icon={<TriangleAlert size={18} />} footnote={missing ? `Chưa khớp sức chứa (+${missing} ô)` : "Đã bố trí đủ sức chứa khai báo"} /><PartnerKpi label="Ô khóa / Bảo trì" value={String(lockedCount)} unit="ô" tone="neutral" icon={<LockKeyhole size={18} />} footnote="Bảo trì sơn vạch / Cảm biến" /></div>
        {live && <div className={styles.liveNotice}><i /><b>Chế độ xem trực tiếp</b><span>Hiển thị bản đã lưu và trạng thái mẫu dùng chung với Tổng quan.{dirty ? " Bản nháp chưa lưu chưa được áp dụng." : ""}</span></div>}
        {error && !modal && <div role="alert" className={styles.error}><TriangleAlert size={17} /><span>{error}</span><button type="button" aria-label="Ẩn lỗi" onClick={() => setError("")}><X size={16} /></button></div>}
        <div className={clsx(styles.editor, properties && styles.withProperties)}>
          <aside className={styles.palette} aria-label="Công cụ sơ đồ">{tools.map(({ id, label, Icon }) => <button type="button" key={id} aria-label={`Công cụ ${label}`} aria-pressed={tool === id} disabled={live && !["select", "pan"].includes(id)} title={label} onClick={() => { setTool(id); setError(""); }}><Icon size={19} /><span>{label}</span></button>)}<hr /><button type="button" aria-label="Hoàn tác" title="Hoàn tác (Ctrl+Z)" disabled={live || !past.length} onClick={undo}><Undo2 size={17} /></button><button type="button" aria-label="Làm lại" title="Làm lại (Ctrl+Shift+Z)" disabled={live || !future.length} onClick={redo}><Redo2 size={17} /></button><button type="button" aria-label="Phím tắt" title="Phím tắt" onClick={() => setModal("help")}><Keyboard size={18} /></button></aside>
          <div className={styles.canvasCard}><div className={styles.canvasHeader}><div className={styles.floorTabs} aria-label="Chọn tầng">{floors.map(f => <button type="button" key={f.id} aria-pressed={floor === f.id} onClick={() => chooseFloor(f.id)}>{f.name}</button>)}</div><div className={styles.canvasControls}><label><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} />Snap to Grid</label><div><button type="button" aria-label="Thu nhỏ sơ đồ" disabled={zoom <= 50} onClick={() => setZoom(v => Math.max(50, v - 10))}><Minus size={14} /></button><span>{zoom}%</span><button type="button" aria-label="Phóng to sơ đồ" disabled={zoom >= 150} onClick={() => setZoom(v => Math.min(150, v + 10))}><Plus size={14} /></button><button type="button" aria-label="Vừa khung sơ đồ" onClick={() => setZoom(Math.max(50, Math.min(100, Math.floor(((viewport.current?.clientWidth ?? 880) - 40) / 848 * 100))))}><Expand size={15} /></button></div></div></div>
            <div className={clsx(styles.viewport, snap && styles.snapGrid, tool === "pan" && styles.panning)} ref={viewport} tabIndex={0} aria-label="Vùng sơ đồ ô đỗ" onPointerDown={e => { if (tool !== "pan") return; pan.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, top: e.currentTarget.scrollTop }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!pan.current) return; e.currentTarget.scrollLeft = pan.current.left - (e.clientX - pan.current.x); e.currentTarget.scrollTop = pan.current.top - (e.clientY - pan.current.y); }} onPointerUp={e => { pan.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { pan.current = null; }}>
              <div className={styles.scaledSpace} style={{ width: 848 * zoom / 100, height: (ROWS * 64 + roads.length * 48 + 112) * zoom / 100 }}><div className={styles.drawing} style={{ transform: `scale(${zoom / 100})` }}><div className={styles.gates}>{view.gates.filter(g => g.floor === floor).map(g => <button type="button" key={g.id} style={{ left: 32 + Math.min(g.col, 8) * 64 }} className={g.type === "entrance" ? styles.entrance : styles.exitGate} onClick={() => { if (canEdit && tool === "erase") apply({ ...draft, gates: draft.gates.filter(item => item.id !== g.id) }); else showInfo(g.type === "entrance" ? "Cổng vào" : "Cổng ra", `Cổng mẫu tại cột ${g.col + 1}, ${floorName(floor)}. Dùng công cụ Lối vào / Đi cửa ra rồi chọn một cột để đổi vị trí.`); }}><DoorClosed size={14} />{g.type === "entrance" ? "CỔNG VÀO (Barrier In · Lối 01)" : "CỔNG RA (Barrier Out · Lối 02)"}{g.type === "entrance" ? <ArrowDown size={13} /> : <ArrowUp size={13} />}</button>)}</div><div className={styles.columnRuler}><span />{Array.from({ length: COLS }, (_, col) => <span key={col}>{String(col + 1).padStart(2, "0")}</span>)}</div>
                {Array.from({ length: ROWS }, (_, row) => <div key={row}><div className={styles.gridRow}><span className={styles.rowRuler}>{rowName(row)}</span>{Array.from({ length: COLS }, (_, col) => {
                  const cell = cells.find(c => c.row === row && c.col === col);
                  const state = cell ? lot.slots.find(s => s.id === cell.slotId)?.state ?? "available" : undefined;
                  const renderedState = live && cell ? state : cell && ["holding", "occupied"].includes(state!) ? state : cell?.locked ? "locked" : "available";
                  const Icon = renderedState === "occupied" ? Car : renderedState === "holding" ? Clock3 : renderedState === "locked" ? LockKeyhole : cell?.vehicle === "ev" ? Zap : Car;
                  return cell ? <button type="button" key={`${row}-${col}`} className={clsx(styles.cell, styles[renderedState!], selected.includes(cell.slotId) && styles.selectedCell)} draggable={canEdit && tool === "select"} onDragStart={e => { dragged.current = cell.slotId; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", cell.slotId); }} onDragEnd={() => { dragged.current = null; }} onDragOver={e => { if (canEdit && dragged.current) e.preventDefault(); }} onDrop={e => onDrop(e, row, col)} aria-label={`Ô ${cell.code}: ${slotLabels[renderedState!]}`} aria-pressed={selected.includes(cell.slotId)} onClick={e => selectCell(cell, e.shiftKey)}><b>{cell.code}</b><Icon size={14} />{selected.includes(cell.slotId) && <i><Check size={10} /></i>}</button> : <button type="button" key={`${row}-${col}`} className={clsx(styles.emptyCell, tool === "add" && canEdit && styles.addTarget)} aria-label={`Vị trí trống hàng ${rowName(row)}, cột ${col + 1}`} onClick={() => editPosition(row, col)} onDragOver={e => { if (canEdit && dragged.current) e.preventDefault(); }} onDrop={e => onDrop(e, row, col)}>{tool === "add" && canEdit && <Plus size={17} />}</button>;
                })}</div>{roads.filter(r => r.afterRow === row).map(road => <button type="button" key={road.id} className={styles.road} aria-label={`Làn xe sau hàng ${rowName(row)}`} onClick={() => { if (tool === "erase" && canEdit) apply({ ...draft, roads: draft.roads.filter(r => r.id !== road.id) }); else if (tool === "road" && canEdit) editPosition(row, 0); else setToast("Chọn Vẽ đường để đổi chiều làn xe; chọn Xóa để bỏ làn."); }}>{road.direction === "right" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}<b>{row === 1 ? "LÀN XE 01 (MỘT CHIỀU · TỐC ĐỘ TỐI ĐA 10 KM/H)" : "LÀN XE 02 (LỐI THOÁT RA BARRIER CỔNG RA)"}</b><span>{road.direction === "right" ? "→ → →" : "← ← ←"}</span></button>)}</div>)}
              </div></div>
              <button type="button" className={styles.minimap} aria-label="Về đầu sơ đồ" title="Về đầu sơ đồ" onClick={() => { viewport.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }}><div>{Array.from({ length: 48 }, (_, i) => <i key={i} style={{ background: i % 7 === 0 ? "#a5b4fc" : "#dbeafe" }} />)}</div><span /></button>
            </div>
            <footer className={styles.legend}><div><b>Chú thích trạng thái:</b><span><i className={styles.availableDot} />Trống (Sẵn sàng)</span><span><i className={styles.holdingDot} />Đang giữ chỗ</span><span><i className={styles.occupiedDot} />Đang có xe đỗ</span><span><i className={styles.lockedDot} />Khóa / Không dùng</span><span><i className={styles.selectedDot} />Đang chọn</span></div><small>Mẹo: Giữ <kbd>Shift</kbd> để chọn nhiều ô · Nhấn <kbd>Del</kbd> để xóa · Kéo ô hoặc dùng phím mũi tên để di chuyển</small></footer>
          </div>{properties && panel}
        </div><div className={styles.bottomNote}><span>Dữ liệu mẫu · Bản nháp được giữ khi chuyển màn trong phiên, tải lại trang sẽ đặt lại.</span><button type="button" onClick={() => { setModal("reset"); setError(""); }}>Bỏ bản nháp</button></div>
      </section>
    </div>
    <PartnerDialog title={modal === "save" ? "Lưu sơ đồ ô đỗ" : modal === "generate" ? "Tạo lưới ô đỗ tự động" : modal === "delete" ? "Xóa ô khỏi sơ đồ?" : modal === "reset" ? "Bỏ các thay đổi chưa lưu?" : modal === "help" ? "Phím tắt & cách dùng" : info.title} open={modal !== null} onClose={() => { setModal(null); setError(""); }}>
      {error && <div role="alert" className={styles.error}><TriangleAlert size={17} /><span>{error}</span></div>}
      {modal === "save" && <div className={styles.modalContent}><p>Lưu cấu hình cho <b>{profile.name}</b>. Các thay đổi về mã và bảo trì ô sẽ được áp dụng vào Tổng quan và Bãi đỗ xe trong phiên xem thử.</p><div className={styles.saveSummary}><span>Sức chứa khai báo<b>{profile.capacity} chỗ</b></span><span>Ô đã dựng<b>{draft.cells.length} ô / {floors.filter(f => draft.cells.some(c => c.floor === f.id)).length} tầng</b></span><span>Chưa định vị<b>{Math.max(0, profile.capacity - draft.cells.length)} ô</b></span></div>{missing > 0 && <div className={styles.warning}><Info size={18} /><p>Bạn có thể lưu bản bố trí chưa đủ sức chứa. Những ô chưa định vị vẫn thuộc bãi và chưa xuất hiện trên bản đồ này.</p></div>}<p className={styles.note}>Đây là bản lưu trong bộ nhớ trình duyệt, chưa gửi lên hệ thống thật.</p><div className={styles.modalActions}><PartnerButton variant="secondary" onClick={() => setModal(null)}>Tiếp tục chỉnh sửa</PartnerButton><PartnerButton onClick={save}><Save size={15} />Xác nhận lưu sơ đồ</PartnerButton></div></div>}
      {modal === "generate" && <form className={styles.modalContent} onSubmit={e => { e.preventDefault(); generate(); }}><p>Bổ sung các ô chưa bố trí vào <b>{floorName(floor)}</b>. Các ô hiện tại và phiên đỗ được giữ nguyên.</p><div className={styles.formGrid}><label className={styles.field}>Số hàng<input type="number" min={1} max={ROWS} value={autoRows} onChange={e => setAutoRows(Number(e.target.value))} required /></label><label className={styles.field}>Số cột<input type="number" min={1} max={COLS} value={autoCols} onChange={e => setAutoCols(Number(e.target.value))} required /></label><label className={styles.field}>Hàng bắt đầu<select value={autoStart} onChange={e => setAutoStart(Number(e.target.value))}>{Array.from({ length: ROWS }, (_, row) => <option key={row} value={row + 1}>{rowName(row)} ({row + 1})</option>)}</select></label><label className={styles.field}>Loại xe<select value={autoVehicle} onChange={e => setAutoVehicle(e.target.value as VehicleKind)}>{profile.vehicles.map(kind => <option key={kind} value={kind}>{vehicleNames[kind]}</option>)}</select></label></div><div className={styles.warning}><Info size={18} /><p>Sẽ tạo {autoRows * autoCols} ô. Còn thiếu {Math.max(0, profile.capacity - draft.cells.length)} ô theo sức chứa khai báo. Vị trí trùng sẽ bị chặn.</p></div><div className={styles.modalActions}><PartnerButton variant="secondary" onClick={() => setModal(null)}>Hủy</PartnerButton><PartnerButton type="submit"><Grid2X2 size={15} />Tạo lưới ô đỗ</PartnerButton></div></form>}
      {modal === "delete" && <div className={styles.modalContent}><p>Xóa {selected.length} ô đã chọn khỏi bản bố trí? Các ô được đưa về danh sách chưa định vị; dữ liệu phiên đỗ cũ được giữ lại.</p><div className={styles.selectionCodes}>{picked.map(c => <span key={c.slotId}>{c.code}</span>)}</div><div className={styles.modalActions}><PartnerButton variant="secondary" onClick={() => setModal(null)}>Giữ lại</PartnerButton><PartnerButton variant="danger" onClick={() => attempt(() => { apply(removeLayoutCells(draft, selected, lot)); setSelected([]); setProperties(false); setModal(null); })}>Xác nhận xóa ô</PartnerButton></div></div>}
      {modal === "reset" && <div className={styles.modalContent}><p>Khôi phục bản đã lưu gần nhất của {profile.name}. Các thay đổi trong bản nháp sẽ được bỏ.</p><div className={styles.modalActions}><PartnerButton variant="secondary" onClick={() => setModal(null)}>Giữ bản nháp</PartnerButton><PartnerButton onClick={() => { apply(baseline); setSelected([]); setProperties(false); setModal(null); setToast("Đã khôi phục sơ đồ đã lưu."); }}>Bỏ bản nháp</PartnerButton></div></div>}
      {modal === "help" && <div className={styles.modalContent}><p>Chọn một ô để chỉnh thuộc tính; giữ Shift và bấm thêm ô để chọn nhiều. Kéo ô vào vị trí trống hoặc dùng các nút di chuyển trong bảng thuộc tính.</p><dl className={styles.shortcuts}><dt>Shift + bấm</dt><dd>Thêm / bỏ ô trong vùng chọn</dd><dt>Phím mũi tên</dt><dd>Di chuyển một bước lưới</dd><dt>Delete</dt><dd>Xóa ô đã chọn khỏi bản bố trí</dd><dt>Ctrl + Z / Ctrl + Shift + Z</dt><dd>Hoàn tác / làm lại</dd><dt>Ctrl + S</dt><dd>Mở xác nhận lưu sơ đồ</dd><dt>Escape</dt><dd>Bỏ chọn / đóng hộp thoại</dd></dl><p>Thêm ô: chọn công cụ rồi bấm ô lưới trống. Vẽ đường: bấm một hàng để thêm làn, bấm làn để đổi chiều. Lối vào / Đi cửa ra: bấm một cột để đặt cổng. Xóa: bấm ô, làn hoặc cổng cần bỏ. Di chuyển: kéo nền để cuộn sơ đồ.</p><p className={styles.note}>Sơ đồ dùng các vị trí lưới cố định. Snap to Grid bật/tắt các điểm căn lưới. Chế độ trực tiếp chỉ xem bản đã lưu.</p></div>}
      {modal === "info" && <div className={styles.modalContent}><p>{info.message}</p><div className={styles.modalActions}><PartnerButton onClick={() => setModal(null)}>Đã hiểu</PartnerButton></div></div>}
    </PartnerDialog>
    {toast && <div className={shell.toast} role="status"><CheckCircle2 size={18} /><span>{toast}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setToast("")}><X size={16} /></button></div>}
  </div>;
}
