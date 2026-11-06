"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, ArrowRight, Bell, Building2, CalendarDays, Car, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Download, ExternalLink, Grid2X2, History, Info, Layers3, LayoutDashboard, LogOut, Menu, MoreVertical, PanelLeftClose, Plus, QrCode, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, TrendingUp, UserRound, Wallet, X, Zap } from "lucide-react";
import { PartnerBadge, PartnerButton, PartnerKpi, PartnerSlot, type PartnerTone } from "./PartnerUI";
import { activeSessionForSlot, createDemoLot, money, registerWalkIn, setSlotLock, slotLabels, statusLabels, summarizeLot, transitionSession, vehicleLabels, type OverviewLot, type ParkingSession, type SessionStatus, type VehicleKind } from "@/lib/overview-model";
import tokens from "./partner.module.css";
import { PartnerSidebar, PartnerHeader } from "./PartnerNavigation";
import { usePartnerWorkspace } from "./PartnerWorkspace";
import Dialog from "./PartnerDialog";
import { syncOverviewProfile } from "@/lib/managed-lots";
import styles from "./overview.module.css";

type Panel = { type: "slot"; id: string } | { type: "session"; id: string } | { type: "walkin" | "approval" | "notifications" | "profile" } | { type: "unavailable"; title: string } | null;
type SessionTab = "all" | "holding" | "parked" | "completed";
const toneFor: Record<SessionStatus, PartnerTone> = { holding: "warning", confirmed: "info", parked: "info", completed: "success", cancelled: "danger" };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]/g, "");

function OccupancyChart({ range, onRange, hasData }: { range: string; onRange: (value: string) => void; hasData: boolean }) {
  const [active, setActive] = useState(4);
  const gradientId = useId().replace(/:/g, "");
  const values = !hasData ? Array.from({ length: 11 }, () => 0) : range === "Hôm qua" ? [16, 24, 45, 65, 76, 61, 45, 52, 72, 84, 79] : range === "7 ngày qua" ? [25, 33, 47, 66, 81, 67, 59, 68, 82, 88, 85] : [12, 22, 41, 65, 86, 74, 53, 56, 70, 85, 90];
  const times = ["06:00", "07:30", "09:00", "10:30", "12:30", "14:00", "15:00", "16:30", "18:00", "19:30", "21:00"];
  const points = values.map((value, i) => ({ x: 40 + i * 43, y: 225 - value * 1.85 }));
  const path = points.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const previous = points[i - 1];
    const before = points[Math.max(0, i - 2)];
    const after = points[Math.min(points.length - 1, i + 1)];
    return `C${previous.x + (p.x - before.x) / 6},${previous.y + (p.y - before.y) / 6} ${p.x - (after.x - previous.x) / 6},${p.y - (after.y - previous.y) / 6} ${p.x},${p.y}`;
  }).join(" ");
  const point = points[active];
  return <article className={styles.chartCard}>
    <div className={styles.chartHeading}><div><h2>Công suất đỗ xe theo khung giờ {range.toLowerCase()}</h2><p>Tải lượng xe dao động theo thời gian thực<br />(Cập nhật 5 phút/lần trong hệ thống)</p></div><div className={styles.segment} aria-label="Khoảng thời gian biểu đồ">{["Hôm nay", "Hôm qua", "7 ngày qua"].map(label => <button type="button" key={label} aria-pressed={range === label} onClick={() => onRange(label)}>{label}</button>)}</div></div>
    <div className={styles.peakLabels}>{!hasData ? <span><Info size={11} />Chưa có dữ liệu công suất của bãi</span> : <><span><Clock3 size={11} /> Cao điểm trưa: 11:30 – 13:30 (84%)</span><span><Clock3 size={11} /> Cao điểm tối: 18:00 – 20:00 (92% dự kiến)</span></>}</div>
    <svg viewBox="0 0 500 275" className={styles.chart} role="group" aria-label={`Biểu đồ công suất ${range.toLowerCase()}`}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".32" /><stop offset="100%" stopColor="#2563eb" stopOpacity=".02" /></linearGradient></defs>
      {[40, 75, 100].map(value => <g key={value}><line x1="40" x2="478" y1={225 - value * 1.85} y2={225 - value * 1.85} stroke="#e2e8f0" strokeDasharray="3 5" /><text x="8" y={229 - value * 1.85} fill="#94a3b8" fontSize="9">{value}%</text></g>)}
      <path d={`${path} L470,225 L40,225 Z`} fill={`url(#${gradientId})`} /><path d={path} fill="none" stroke="#2563eb" strokeWidth="2.5" />
      <line x1="40" y1="225" x2="478" y2="225" stroke="#e2e8f0" />
      {points.map((p, i) => <g key={times[i]}><circle cx={p.x} cy={p.y} r={i === active ? 4 : 9} fill={i === active ? "#2563eb" : "transparent"} stroke={i === active ? "white" : "none"} strokeWidth="2" role="button" tabIndex={0} aria-label={`${times[i]}, công suất ${values[i]} phần trăm`} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onClick={() => setActive(i)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(i); } }} />{i % 2 === 0 && <text x={p.x} y="246" textAnchor="middle" fill="#64748b" fontSize="10">{times[i]}</text>}</g>)}
      <g transform={`translate(${Math.min(Math.max(point.x - 38, 40), 400)},${Math.max(point.y - 34, 4)})`} aria-hidden="true"><rect width="85" height="23" rx="5" fill="#0f172a" /><text x="42" y="15" textAnchor="middle" fill="white" fontSize="10">{times[active]} • {values[active]}%</text></g>
    </svg>
    <div className={styles.chartFoot}><span><i />Lưu lượng xe gửi & đỗ trung bình theo 30 phút</span><span aria-live="polite">{times[active]} · {values[active]}%</span></div>
  </article>;
}

export function SessionDetails({ session, onAction }: { session: ParkingSession; onAction: (action: "checkin" | "checkout" | "cancel", reason?: string) => void }) {
  const [reason, setReason] = useState("");
  const [checkout, setCheckout] = useState(false);
  return <div className={styles.sessionDetails}>
    <div className={styles.detailIdentity}><span className={styles.detailIcon}><Car size={24} /></span><div><strong>{session.plate}</strong><p>{vehicleLabels[session.vehicle]}</p></div><PartnerBadge tone={toneFor[session.status]}>{statusLabels[session.status]}</PartnerBadge></div>
    <dl><div><dt>Mã đặt chỗ</dt><dd>{session.id}</dd></div><div><dt>Khách hàng</dt><dd>{session.customer}</dd></div><div><dt>Liên hệ</dt><dd>{session.phone}</dd></div><div><dt>Ô đỗ</dt><dd>{session.slotId}</dd></div><div><dt>Thời gian</dt><dd>{session.time}<small>{session.timeDetail}</small></dd></div><div><dt>Tiền cọc</dt><dd>{money(session.deposit)}</dd></div><div><dt>{session.status === "completed" ? "Đã thu" : "Tạm tính"}</dt><dd>{money(session.amount)}</dd></div></dl>
    {session.reason && <div className={styles.detailNote}><Info size={16} /><span>Lý do: {session.reason}</span></div>}
    {["holding", "confirmed"].includes(session.status) && <><PartnerButton className={styles.fullButton} onClick={() => onAction("checkin")}><CheckCircle2 size={16} /> Xác nhận nhận xe</PartnerButton><form className={styles.cancelForm} onSubmit={e => { e.preventDefault(); onAction("cancel", reason); }}><label>Lý do hủy đặt chỗ<textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do hủy (bắt buộc)" required /></label><PartnerButton type="submit" variant="danger" disabled={!reason.trim()}>Xác nhận hủy đặt chỗ</PartnerButton></form></>}
    {session.status === "parked" && (checkout ? <div className={styles.checkoutConfirmation}><strong>Xác nhận xe đã rời bãi?</strong><p>Quyết toán mẫu: <b>{money(Math.max(session.amount, 80000))}</b>. Ô {session.slotId} sẽ chuyển sang trống.</p><div className={styles.actionRow}><PartnerButton variant="secondary" onClick={() => setCheckout(false)}>Quay lại</PartnerButton><PartnerButton onClick={() => onAction("checkout")}>Xác nhận trả xe</PartnerButton></div></div> : <PartnerButton className={styles.fullButton} onClick={() => setCheckout(true)}><LogOut size={16} /> Trả xe & quyết toán</PartnerButton>)}
    <p className={styles.demoNote}><ShieldCheck size={14} /> Thao tác mô phỏng, không điều khiển cổng hoặc thu tiền thật.</p>
  </div>;
}

function WalkInForm({ lot, onSubmit, error }: { lot: OverviewLot; onSubmit: (input: { customer: string; plate: string; vehicle: VehicleKind; slotId: string }) => void; error: string }) {
  const [customer, setCustomer] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicle, setVehicle] = useState<VehicleKind>("sedan");
  const available = lot.slots.filter(s => s.state === "available");
  const [slotId, setSlotId] = useState(available[0]?.id ?? "");
  return <form className={styles.walkInForm} onSubmit={e => { e.preventDefault(); onSubmit({ customer, plate, vehicle, slotId }); }}><p>Ghi nhận xe vào trực tiếp tại <strong>{lot.name}</strong>.</p><label>Tên khách hàng<input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Nhập họ và tên" required autoComplete="name" /></label><label>Biển số xe<input value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} placeholder="43A-123.45" required autoCapitalize="characters" /></label><div className={styles.formColumns}><label>Loại xe<select value={vehicle} onChange={e => setVehicle(e.target.value as VehicleKind)}>{Object.entries(vehicleLabels).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label><label>Ô đỗ trống<select value={slotId} onChange={e => setSlotId(e.target.value)} disabled={!available.length}>{available.map(slot => <option key={slot.id} value={slot.id}>{slot.id} · Khu {slot.zone}</option>)}</select></label></div>{error && <p className={styles.error} role="alert">{error}</p>}{!available.length && <p className={styles.error}>Bãi đã hết chỗ trống.</p>}<div className={styles.detailNote}><Info size={16} />Xe sẽ được ghi nhận đang đỗ, không tạo khoản cọc trực tuyến.</div><PartnerButton type="submit" className={styles.fullButton} disabled={!available.length}><Plus size={16} /> Xác nhận xe vào bãi</PartnerButton></form>;
}

export function downloadCsv(lot: OverviewLot, sessions: ParkingSession[]) {
  const cell = (value: unknown) => { const text = String(value); return `"${(/^[=+@-]/.test(text.trimStart()) ? "'" : "") + text.replace(/"/g, '""')}"`; };
  const rows = [["Bãi xe", "Mã đặt", "Khách hàng", "Biển số", "Loại xe", "Ô đỗ", "Trạng thái", "Tiền cọc (VNĐ)", "Tạm tính / Đã thu (VNĐ)"], ...sessions.map(s => [lot.name, s.id, s.customer, s.plate, vehicleLabels[s.vehicle], s.slotId, statusLabels[s.status], s.deposit, s.amount])];
  const url = URL.createObjectURL(new Blob(["\uFEFF", rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = `ez-space-${lot.id}-bao-cao-mau.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PartnerOverview() {
  const { overviews: lots, setOverviews: setLots, catalog, selectedId: lotId, selectLot: setLotId } = usePartnerWorkspace();
  const lotProfile = catalog.find(item => item.id === lotId)!;
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [range, setRange] = useState("Hôm nay");
  const [tab, setTab] = useState<SessionTab>("all");
  const [query, setQuery] = useState("");
  const [vehicle, setVehicle] = useState("all");
  const [status, setStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [compact, setCompact] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lot = lots[lotId];
  const summary = summarizeLot(lot);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); }, []);
  const filtered = useMemo(() => lot.sessions.filter(s => (tab === "all" || (tab === "holding" ? ["holding", "confirmed"].includes(s.status) : s.status === tab)) && (vehicle === "all" || s.vehicle === vehicle) && (status === "all" || s.status === status) && (!query || normalize(`${s.id} ${s.customer} ${s.plate}`).includes(normalize(query)))), [lot.sessions, tab, vehicle, status, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 5));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * 5, currentPage * 5);
  const selectedSlot = panel?.type === "slot" ? lot.slots.find(s => s.id === panel.id) : undefined;
  const selectedSession = panel?.type === "session" ? lot.sessions.find(s => s.id === panel.id) : selectedSlot ? activeSessionForSlot(lot, selectedSlot.id) : undefined;
  function open(next: Panel) { setError(""); setPanel(next); setSidebarOpen(false); }
  function mutate(update: (value: OverviewLot) => OverviewLot, message: string) {
    try { const next = update(lot); setLots(value => ({ ...value, [lotId]: next })); setError(""); setNotice(message); return true; }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể hoàn tất thao tác."); return false; }
  }
  function resetFilters() { setQuery(""); setVehicle("all"); setStatus("all"); setTab("all"); setPage(1); }
  function refresh() { setRefreshing(true); refreshTimer.current = setTimeout(() => { const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); setUpdatedAt(time); setRefreshing(false); setNotice(`Đã cập nhật lại dữ liệu mẫu lúc ${time}.`); }, 700); }
  function exportDayReport() {
    const todaySessions = filtered.filter(session => !session.time.startsWith("Hôm qua"));
    if (!todaySessions.length) { setNotice("Không có phiên đỗ trong ngày phù hợp với bộ lọc hiện tại."); return; }
    downloadCsv(lot, todaySessions);
    setNotice("Đã xuất báo cáo ngày từ dữ liệu mẫu theo bộ lọc hiện tại.");
  }
  const panelTitle = panel?.type === "slot" ? `Chi tiết ô đỗ ${panel.id}` : panel?.type === "session" ? `Chi tiết phiên đỗ ${panel.id}` : panel?.type === "walkin" ? "Đăng ký xe vãng lai" : panel?.type === "approval" ? "Hồ sơ liên kết cổng Barrier" : panel?.type === "notifications" ? "Thông báo" : panel?.type === "profile" ? "Tài khoản đối tác" : panel?.type === "unavailable" ? panel.title : "";

  return <div className={clsx(tokens.partner, styles.shell, compact && styles.compact, sidebarCollapsed && styles.collapsed)}>
    <PartnerSidebar active="overview" open={sidebarOpen} collapsed={sidebarCollapsed} onClose={() => setSidebarOpen(false)} onCollapse={() => setSidebarCollapsed(value => !value)} onAuxiliary={title => open(title === "Tài khoản đối tác" ? { type: "profile" } : { type: "unavailable", title })} />
    <div className={styles.workspace}>
      <PartnerHeader page="overview" compact={compact} onCompact={setCompact} onMenu={() => setSidebarOpen(true)} selectedId={lotId} onSelect={id => { setLotId(id); resetFilters(); setPanel(null); }} lots={catalog.filter(item => ["active", "paused"].includes(item.status))} onNotifications={() => open({ type: "notifications" })} onProfile={() => open({ type: "profile" })} />
      <div className={styles.content}>
        <div className={styles.pageHeading}><div><div className={styles.pageTitle}><h1>Tổng quan bãi đỗ xe</h1><span><i />Live Sync · Demo</span></div><p>Theo dõi tình trạng bãi xe, lượt đặt chỗ và điều phối phiên đỗ theo thời gian thực</p></div><div className={styles.headingActions}><PartnerButton variant="secondary" loading={refreshing} onClick={refresh}>{!refreshing && <RefreshCw size={14} />} Làm mới dữ liệu</PartnerButton><PartnerButton variant="secondary" onClick={exportDayReport}><Download size={14} /> Xuất báo cáo ngày</PartnerButton><PartnerButton disabled={lotProfile.status === "paused"} onClick={() => open({ type: "walkin" })}><Plus size={16} /> Đăng ký xe vãng lai</PartnerButton></div></div>
        <section className={styles.approvalBanner} aria-label="Trạng thái kiểm duyệt"><span className={styles.warningIcon}><AlertTriangle size={22} /></span><div><h2>{lotProfile.status === "paused" ? "Bãi đang tạm ngưng tiếp nhận xe mới" : "Bãi của bạn đang chờ Quản trị viên EZ-Space xét duyệt liên kết cổng Barrier"}</h2><p>{lotProfile.status === "paused" ? "Các phiên đỗ và giữ chỗ hiện tại vẫn được giữ nguyên. Để tiếp nhận xe mới, hãy kích hoạt lại bãi trong mục Bãi đỗ xe." : <>Hồ sơ bãi đỗ xe {lot.name} đang được đối soát thiết bị IoT Gate Kiosk. Quý đối tác vẫn có thể cấu hình sơ đồ ô đỗ và bảng giá trước khi mở đón khách trực tuyến.</>}</p></div>{lotProfile.status === "paused" ? <Link href="/lots">Quản lý bãi đỗ <ArrowRight size={14} /></Link> : <button type="button" onClick={() => open({ type: "approval" })}>Xem hồ sơ kiểm duyệt <ArrowRight size={14} /></button>}</section>
        <div className={styles.statGrid}>
          <PartnerKpi label="Tổng sức chứa" value={String(summary.capacity)} unit="chỗ" tone="info" icon={<Layers3 size={20} />} footnote={<><span className={styles.trend}><TrendingUp size={12} /> {lotId === "hai-chau-1" ? "+12 chỗ" : "Đã khai báo"}</span><span>{lotId === "hai-chau-1" ? "Tầng B1 vừa kích hoạt" : "Sức chứa từ hồ sơ bãi"}</span></>} />
          <PartnerKpi label="Đang trống" value={String(summary.available)} unit="chỗ" tone="success" icon={<CheckCircle2 size={20} />} footnote={<><PartnerBadge tone="success">Tỉ lệ trống {summary.capacity ? Math.round(summary.available / summary.capacity * 100) : 0}%</PartnerBadge><span>Sẵn sàng đón xe</span></>} />
          <PartnerKpi label="Đang giữ chỗ (Holding)" value={String(summary.holding)} unit="xe" tone="warning" icon={<Clock3 size={20} />} footnote={<><PartnerBadge tone="warning">Đến 15–20p</PartnerBadge><span>Cọc: {money(summary.deposits)}</span></>} />
          <PartnerKpi label="Đang đỗ thực tế" value={String(summary.occupied)} unit="xe" tone="neutral" icon={<Car size={20} />} footnote={<><PartnerBadge>Công suất {summary.capacity ? Math.round(summary.occupied / summary.capacity * 100) : 0}%</PartnerBadge><span>Tạm thu: {money(lot.collected)}</span></>} />
        </div>
        <div className={styles.chartGrid}><OccupancyChart range={range} onRange={setRange} hasData={lot.sessions.length > 0} /><article className={styles.occupancyCard}><div className={styles.occupancyHeading}><div><h2>Tình trạng khu vực ô đỗ nhanh</h2><p>Phân bố tải theo từng tầng đậu xe</p></div><button type="button" onClick={() => open({ type: "slot", id: "A-07" })}>Sơ đồ chi tiết <ChevronRight size={14} /></button></div><div className={styles.zones}>{(["A", "B", "C"] as const).map((zone, i) => { const zoneSlots = lot.slots.filter(s => s.zone === zone && s.state !== "locked"); const count = zoneSlots.filter(s => s.state === "occupied").length; return <div key={zone}><div><strong><i style={{ backgroundColor: ["#004dcc", "#4f67ff", "#00883e"][i] }} />{["Tầng Trệt (Khu A)", "Tầng Lửng (Khu B)", "Tầng Hầm B1 (Khu C)"][i]}</strong><span>{count} / {zoneSlots.length} xe ({(zoneSlots.length ? Math.round(count / zoneSlots.length * 100) : 0)}%)</span></div><progress aria-label={`Công suất khu ${zone}`} max={Math.max(1, zoneSlots.length)} value={count} style={{ accentColor: ["#004dcc", "#4f67ff", "#00883e"][i] }} /></div>; })}</div><div className={styles.miniHeading}><strong>12 Ô ĐỖ TIÊU BIỂU KHU A</strong><span><i />Trống <i />Giữ <i />Đỗ</span></div><div className={styles.miniGrid}>{lot.slots.filter(s => s.zone === "A").slice(0, 12).map(slot => <PartnerSlot key={slot.id} code={slot.id} state={slot.state} inspectable iconSize={12} className={styles.miniSlot} onClick={() => open({ type: "slot", id: slot.id })} />)}</div></article></div>
        <section className={styles.tableCard} aria-labelledby="recent-sessions"><div className={styles.tableHeading}><div><h2 id="recent-sessions">Phiên đỗ & Đặt chỗ gần nhất</h2><p>Dữ liệu mẫu từ Gate Kiosk và đơn đặt từ ứng dụng EZ-Space</p></div><div className={styles.segment} aria-label="Lọc trạng thái phiên đỗ">{([["all", "Tất cả", lot.sessions.length], ["holding", "Đang giữ chỗ", lot.sessions.filter(s => ["holding", "confirmed"].includes(s.status)).length], ["parked", "Đang đỗ", lot.sessions.filter(s => s.status === "parked").length], ["completed", "Hoàn thành", lot.sessions.filter(s => s.status === "completed").length]] as [SessionTab, string, number][]).map(([value, label, count]) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => { setTab(value); setPage(1); }}>{label} ({count})</button>)}</div></div>
          <div className={styles.tableFilters}><label className={styles.searchField}><Search size={16} /><input aria-label="Tìm kiếm phiên đỗ" placeholder="Tìm kiếm biển số xe, mã đặt vé, họ tên khách hàng..." value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />{query && <button type="button" aria-label="Xóa từ khóa" onClick={() => { setQuery(""); setPage(1); }}><X size={14} /></button>}</label><select aria-label="Lọc loại xe" value={vehicle} onChange={e => { setVehicle(e.target.value); setPage(1); }}><option value="all">Tất cả loại xe</option>{Object.entries(vehicleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button type="button" className={styles.filterButton} aria-label="Bộ lọc bổ sung" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><SlidersHorizontal size={17} /></button></div>
          {showFilters && <div className={styles.advancedFilters}><label>Trạng thái chi tiết<select aria-label="Trạng thái chi tiết" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button type="button" onClick={resetFilters}>Đặt lại bộ lọc</button></div>}
          <div className={styles.tableScroll}><table><thead><tr>{["Mã đặt", "Khách hàng", "Biển số & Xe", "Ô đỗ", "Trạng thái", "Thời gian / Hẹn", "Cọc / Tiền thu", "Thao tác"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{pageRows.map(session => <tr key={session.id} className={session.status === "cancelled" ? styles.cancelledRow : undefined}><td><button type="button" className={styles.idButton} onClick={() => open({ type: "session", id: session.id })}>{session.id}</button></td><td><strong>{session.customer}</strong><small>{session.phone}</small></td><td><b className={styles.plate}>{session.plate}</b><small className={session.vehicle === "ev" ? styles.ev : undefined}>{session.vehicle === "ev" && <Zap size={11} />}{vehicleLabels[session.vehicle]}</small></td><td><button type="button" className={styles.slotCode} onClick={() => open({ type: "slot", id: session.slotId })}>{session.slotId}</button></td><td><PartnerBadge tone={toneFor[session.status]}>{statusLabels[session.status]}</PartnerBadge></td><td><strong>{session.time}</strong><small className={session.status === "holding" ? styles.amber : session.status === "cancelled" ? styles.ev : undefined}>{session.timeDetail}</small></td><td className={clsx(styles.amount, session.status === "completed" && styles.ev)}>{money(session.amount)}</td><td><div className={styles.rowActions}><PartnerButton size="small" variant={session.status === "holding" ? "primary" : "secondary"} onClick={() => open({ type: "session", id: session.id })}>{session.status === "holding" ? "Nhận xe" : session.status === "confirmed" ? "Xem vé" : session.status === "completed" ? "Hóa đơn" : session.status === "cancelled" ? "Xem log" : "Chi tiết"}</PartnerButton><button type="button" aria-label={`Thao tác đơn ${session.id}`} onClick={() => open({ type: "session", id: session.id })}><MoreVertical size={16} /></button></div></td></tr>)}</tbody></table>{!pageRows.length && <div className={styles.emptyState}><Search size={26} /><h3>Không tìm thấy phiên đỗ phù hợp</h3><p>Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc.</p><PartnerButton variant="secondary" onClick={resetFilters}>Xóa bộ lọc</PartnerButton></div>}</div>
          <div className={styles.pagination}><span>Hiển thị {filtered.length ? (currentPage - 1) * 5 + 1 : 0} – {Math.min(currentPage * 5, filtered.length)} trong tổng số <b>{filtered.length}</b> bản ghi</span><div><button type="button" aria-label="Trang trước" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>{Array.from(new Set([1, currentPage > 2 ? currentPage - 1 : 2, currentPage > 2 ? currentPage : 3, ...(currentPage + 1 < pageCount && currentPage > 2 ? [currentPage + 1] : []), pageCount])).filter(n => n <= pageCount).sort((a, b) => a - b).map((n, i, all) => <span key={n}>{i > 0 && n - all[i - 1] > 1 && <em>…</em>}<button type="button" aria-label={`Trang ${n}`} aria-current={currentPage === n ? "page" : undefined} onClick={() => setPage(n)}>{n}</button></span>)}<button type="button" aria-label="Trang sau" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></div>
        </section>
        <section className={styles.simulationBar}><span className={styles.simulationIcon}><SlidersHorizontal size={24} /></span><div><h2>Thao tác mô phỏng & Đối soát nhanh</h2><p>Bấm vào bất kỳ ô đỗ nào phía trên để xem Drawer chi tiết hoặc tạo xe vào thủ công</p></div><div className={styles.actionRow}><PartnerButton variant="secondary" size="small" onClick={() => open({ type: "slot", id: "A-07" })}><QrCode size={14} /> Mô phỏng Drawer Ô A-07</PartnerButton><PartnerButton variant="secondary" size="small" onClick={() => open({ type: "unavailable", title: "Gate Kiosk" })}><ExternalLink size={14} /> Mở Màn Hình Gate Kiosk</PartnerButton></div></section>
        <footer className={styles.pageFooter}><span><Info size={13} /> Dữ liệu mẫu, chưa kết nối cổng thật{updatedAt ? ` · Cập nhật ${updatedAt}` : ""}</span><button type="button" onClick={() => { setLots(value => ({ ...value, [lotId]: syncOverviewProfile(lotId === "hai-chau-1" ? createDemoLot() : undefined, lotProfile) })); resetFilters(); setNotice("Đã khôi phục dữ liệu mẫu của bãi đang xem."); }}>Đặt lại dữ liệu mẫu</button></footer>
      </div>
    </div>
    <Dialog open={panel !== null} title={panelTitle} side={panel?.type === "slot" || panel?.type === "session"} onClose={() => setPanel(null)}>
      {selectedSlot && <><div className={styles.slotSummary}><span className={styles.largeSlot}>{selectedSlot.id}</span><div><strong>Khu {selectedSlot.zone} · {slotLabels[selectedSlot.state]}</strong><p>{lot.name}</p></div></div>{!selectedSession && <><div className={styles.detailNote}><Info size={16} />{selectedSlot.state === "locked" ? lot.capacityNote : "Ô đang trống, sẵn sàng tiếp nhận xe."}</div><PartnerButton className={styles.fullButton} onClick={() => mutate(value => setSlotLock(value, selectedSlot.id, selectedSlot.state !== "locked"), selectedSlot.state === "locked" ? "Đã mở ô đỗ trong dữ liệu mẫu." : "Đã khóa ô đỗ để bảo trì trong dữ liệu mẫu.")}>{selectedSlot.state === "locked" ? "Mở lại ô đỗ" : "Khóa ô để bảo trì"}</PartnerButton></>}</>}
      {selectedSession && <SessionDetails key={selectedSession.id} session={selectedSession} onAction={(action, reason) => mutate(value => transitionSession(value, selectedSession.id, action, reason), action === "checkin" ? "Đã nhận xe. KPI và ô đỗ mẫu đã được cập nhật." : action === "checkout" ? "Đã trả xe và giải phóng ô đỗ trong dữ liệu mẫu." : "Đã hủy đặt chỗ và giải phóng ô đỗ trong dữ liệu mẫu.")} />}
      {error && panel?.type !== "walkin" && <p className={styles.error} role="alert">{error}</p>}
      {panel?.type === "walkin" && <WalkInForm lot={lot} error={error} onSubmit={input => { if (mutate(value => registerWalkIn(value, input), "Đã ghi nhận xe vãng lai trong dữ liệu mẫu.")) { setPanel(null); resetFilters(); } }} />}
      {panel?.type === "approval" && <div className={styles.infoPanel}><PartnerBadge tone="warning">Đang đối soát thiết bị</PartnerBadge><h3>{lot.name}</h3><p>{lot.location}</p><ol><li><CheckCircle2 size={18} /><div><b>Thông tin đối tác</b><span>Đã tiếp nhận hồ sơ</span></div></li><li><CheckCircle2 size={18} /><div><b>Sơ đồ & sức chứa</b><span>{summary.capacity} chỗ đang khai thác</span></div></li><li><Clock3 size={18} /><div><b>Liên kết Gate Kiosk</b><span>Chờ Quản trị viên đối soát kết nối</span></div></li></ol><div className={styles.detailNote}><Info size={16} />Hồ sơ minh họa. Chưa gửi yêu cầu kiểm duyệt thật.</div></div>}
      {panel?.type === "notifications" && <div className={styles.infoPanel}><article><AlertTriangle size={20} /><div><h3>Liên kết cổng đang chờ kiểm duyệt</h3><p>Kiểm tra hồ sơ thiết bị của {lot.name}.</p><PartnerButton variant="ghost" size="small" onClick={() => open({ type: "approval" })}>Xem hồ sơ <ArrowRight size={13} /></PartnerButton></div></article><article><CheckCircle2 size={20} /><div><h3>Tầng B1 đã được kích hoạt</h3><p>Sơ đồ ô đỗ và sức chứa mẫu đã sẵn sàng.</p></div></article></div>}
      {panel?.type === "profile" && <div className={styles.infoPanel}><span className={styles.profileAvatar}><UserRound size={30} /></span><h3>Minh Trần</h3><p>Quản lý bãi · Đối tác EZ-Space</p><p>haichau1@ezspace.vn</p><div className={styles.detailNote}><ShieldCheck size={16} />Tài khoản minh họa của giao diện Partner.</div><Link href="/design-system" className={styles.textLink}>Xem bộ quy chuẩn giao diện <ArrowRight size={15} /></Link></div>}
      {panel?.type === "unavailable" && <div className={styles.infoPanel}><span className={styles.profileAvatar}><Info size={28} /></span><h3>Chức năng đang được hoàn thiện</h3><p>Hiện bạn có thể xem Tổng quan, quản lý bãi đỗ và thử các thao tác mẫu. Mục {panel.title} sẽ được bổ sung sau.</p><PartnerButton variant="secondary" onClick={() => setPanel(null)}>Quay lại Tổng quan</PartnerButton></div>}
    </Dialog>
    {notice && <div className={styles.toast} role="status"><CheckCircle2 size={18} /><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setNotice("")}><X size={17} /></button></div>}
  </div>;
}
