"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { CalendarDays, Car, CheckCircle2, ChevronLeft, ChevronRight, CircleX, Download, Eye, Hourglass, LayoutGrid, List, LockKeyhole, Search, SlidersHorizontal, X } from "lucide-react";
import { money, setSlotLock, statusLabels, summarizeLot, transitionSession, vehicleLabels, type ParkingSession, type SessionStatus, type VehicleKind } from "@/lib/overview-model";
import { usePartnerWorkspace } from "./PartnerWorkspace";
import { PartnerHeader, PartnerSidebar } from "./PartnerNavigation";
import { PartnerBadge, PartnerButton, PartnerKpi, type PartnerTone } from "./PartnerUI";
import Dialog from "./PartnerDialog";
import { downloadCsv, SessionDetails } from "./PartnerOverview";
import tokens from "./partner.module.css";
import shell from "./overview.module.css";
import styles from "./sessions.module.css";

type Filter = "all" | SessionStatus;
const tones: Record<SessionStatus, PartnerTone> = { holding: "info", confirmed: "info", parked: "success", completed: "neutral", cancelled: "danger" };
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function PartnerSessions() {
  const { catalog, selectedId, selectLot, overviews, setOverviews } = usePartnerWorkspace();
  const lot = overviews[selectedId];
  const [tab, setTab] = useState<"reservations" | "parking">("reservations");
  const [status, setStatus] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [vehicle, setVehicle] = useState<VehicleKind | "all">("all");
  const [period, setPeriod] = useState("today");
  const [page, setPage] = useState(1);
  const [cards, setCards] = useState(false);
  const [compact, setCompact] = useState(false);
  const [navOpen, setNavOpen] = useState(false), [collapsed, setCollapsed] = useState(false);
  const [panel, setPanel] = useState<"details" | "locks" | "info" | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lockSlot, setLockSlot] = useState("");
  const [lockConfirm, setLockConfirm] = useState(false);
  const summary = summarizeLot(lot);
  const inPeriod = (session: ParkingSession) => period === "all" || (period === "history" ? session.time.startsWith("Hôm qua") : !session.time.startsWith("Hôm qua"));
  const today = lot.sessions.filter(s => !s.time.startsWith("Hôm qua"));
  const reservations = lot.sessions.filter(s => s.deposit > 0 && s.status !== "parked");
  const parking = lot.sessions.filter(s => s.status === "parked" || s.status === "completed");
  const source = (tab === "reservations" ? reservations : parking).filter(inPeriod);
  const filters: { id: Filter; label: string }[] = tab === "reservations" ? [{ id: "all", label: "Tất cả" }, { id: "holding", label: "Đang giữ chỗ" }, { id: "confirmed", label: "Đã xác nhận" }, { id: "completed", label: "Hoàn thành" }, { id: "cancelled", label: "Đã hủy" }] : [{ id: "all", label: "Tất cả" }, { id: "parked", label: "Đang đỗ" }, { id: "completed", label: "Đã rời bãi" }];
  const filtered = source.filter(s => (status === "all" || s.status === status) && (vehicle === "all" || s.vehicle === vehicle) && normalize(`${s.id} ${s.customer} ${s.plate} ${s.phone} ${s.slotId}`).includes(normalize(query)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / 4));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * 4, currentPage * 4);
  const session = lot.sessions.find(s => s.id === focusId);
  const locked = lot.slots.filter(s => s.state === "locked");
  const available = lot.slots.filter(s => s.state === "available");
  const count = (id: Filter) => id === "all" ? source.length : source.filter(s => s.status === id).length;
  function openSession(id: string) { setFocusId(id); setPanel("details"); setError(""); }
  function showInfo(title: string) { setInfo(title); setPanel("info"); }
  function close() { setPanel(null); setError(""); setLockConfirm(false); }
  function announce(message: string) { setNotice(message); }
  function action(action: "checkin" | "checkout" | "cancel", reason = "") {
    if (!focusId) return;
    try {
      const updated = transitionSession(lot, focusId, action, reason);
      setOverviews(value => ({ ...value, [selectedId]: updated }));
      setError(""); announce(action === "checkin" ? "Đã nhận xe, ô đỗ chuyển sang đang sử dụng." : action === "checkout" ? "Đã trả xe và quyết toán mẫu, ô đỗ đã trống." : "Đã hủy đặt chỗ và giải phóng ô đỗ.");
    } catch (err) { setError((err as Error).message); }
  }
  function changeLock(id: string, locked: boolean) {
    try { const updated = setSlotLock(lot, id, locked); setOverviews(value => ({ ...value, [selectedId]: updated })); setLockConfirm(false); setLockSlot(""); setError(""); announce(locked ? `Đã khóa ô ${id}.` : `Đã mở khóa ô ${id}.`); }
    catch (err) { setError((err as Error).message); }
  }
  function reset() { setStatus("all"); setVehicle("all"); setQuery(""); setPeriod("today"); setPage(1); }
  const payment = (s: ParkingSession) => s.status === "cancelled" ? "Đã hoàn cọc" : s.status === "completed" ? "Đã tất toán" : s.status === "parked" ? "Tạm tính" : "Đã thanh toán cọc";
  return <div className={clsx(tokens.partner, shell.shell, compact && shell.compact, collapsed && shell.collapsed)}>
    <PartnerSidebar active="sessions" open={navOpen} collapsed={collapsed} onClose={() => setNavOpen(false)} onCollapse={() => setCollapsed(v => !v)} onAuxiliary={showInfo} />
    <div className={shell.workspace}>
      <PartnerHeader page="sessions" compact={compact} onCompact={setCompact} onMenu={() => setNavOpen(true)} selectedId={selectedId} onSelect={id => { selectLot(id); reset(); close(); }} lots={catalog.filter(l => ["active", "paused"].includes(l.status))} onNotifications={() => showInfo("Thông báo")} onProfile={() => showInfo("Tài khoản đối tác")} />
      <main className={styles.content}>
        <div className={styles.heading}><div><h1>Đặt chỗ & Phiên đỗ <span>Live Sync</span></h1><p>Theo dõi đơn đặt chỗ, phương tiện đang đỗ và xử lý ngoại lệ theo thời gian thực</p></div><div className={styles.actions}><PartnerButton variant="secondary" onClick={() => { setPanel("locks"); setError(""); }}><LockKeyhole size={15} />Khóa ô khách vãng lai <b>{locked.length} đang khóa</b></PartnerButton><PartnerButton variant="secondary" onClick={() => { downloadCsv(lot, filtered); announce(`Đã xuất ${filtered.length} bản ghi theo bộ lọc.`); }}><Download size={15} />Xuất CSV</PartnerButton></div></div>
        <div className={styles.kpis}>
          <PartnerKpi label="Đang giữ chỗ" value={String(today.filter(s => s.status === "holding").length).padStart(2,"0")} unit="đơn" tone="info" icon={<Hourglass size={22} />} footnote={<span>● Chờ khách đến nhận chỗ</span>} />
          <PartnerKpi label="Đã xác nhận (chờ đến)" value={String(today.filter(s => s.status === "confirmed").length).padStart(2,"0")} unit="đơn" tone="info" icon={<CheckCircle2 size={22} />} footnote={<span>Check-in tiếp theo: <b>{today.find(s=>s.status === "confirmed")?.time.replace("Hẹn: ","") ?? "Chưa có"}</b></span>} />
          <PartnerKpi label="Xe đang đỗ tại bãi" value={String(summary.occupied).padStart(2,"0")} unit={`${Math.round(summary.occupied / Math.max(1, summary.capacity) * 100)}% công suất`} tone="success" icon={<Car size={23} />} footnote={<div className={styles.occupancy}><i style={{width:`${summary.occupied / Math.max(1, summary.capacity) * 100}%`}} /><span>Còn trống {summary.available}/{summary.capacity} ô</span></div>} />
          <PartnerKpi label="Đơn đã hủy hôm nay" value={String(today.filter(s=>s.status === "cancelled").length).padStart(2,"0")} unit="đơn" tone="danger" icon={<CalendarDays size={22} />} footnote={<span>Cọc hoàn theo trạng thái đơn</span>} />
        </div>
        <section className={styles.listPanel} aria-label="Danh sách đặt chỗ và phiên đỗ">
          <div className={styles.listHeading}><div className={styles.tabs} role="tablist" aria-label="Loại danh sách">{(["reservations", "parking"] as const).map(id => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls="session-results" aria-selected={tab===id} onClick={()=>{setTab(id);setStatus("all");setPage(1);}}>{id === "reservations" ? <CalendarDays size={18}/> : <Car size={18}/>}<span>{id === "reservations" ? <>Đơn đặt chỗ<small>(Reservations)</small></> : <>Phiên đỗ xe<small>(Parking Sessions)</small></>}</span><b>{(id === "reservations" ? reservations : parking).filter(inPeriod).length}</b></button>)}</div><div className={styles.viewSwitch} aria-label="Chế độ hiển thị"><button type="button" aria-pressed={!cards} onClick={()=>setCards(false)}><List size={15}/>Desktop Table<small>(1440)</small></button><button type="button" aria-pressed={cards} onClick={()=>setCards(true)}><LayoutGrid size={15}/>Tablet Cards<small>(1024)</small></button></div></div>
          <div className={styles.filters} aria-label="Lọc trạng thái">{filters.map(f=><button type="button" key={f.id} aria-pressed={status===f.id} onClick={()=>{setStatus(f.id);setPage(1);}}>{f.label}<b>{count(f.id)}</b></button>)}</div>
          <div className={styles.toolbar}><label className={styles.search}><Search size={16}/><input aria-label="Tìm đặt chỗ và phiên đỗ" placeholder="Tìm theo mã đơn, biển số, tên khách…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><select aria-label="Loại xe" value={vehicle} onChange={e=>{setVehicle(e.target.value as VehicleKind|"all");setPage(1);}}><option value="all">Loại xe: Tất cả</option>{Object.entries(vehicleLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><label className={styles.period}><CalendarDays size={15}/><select aria-label="Khoảng thời gian" value={period} onChange={e=>{setPeriod(e.target.value);setPage(1);}}><option value="today">Hôm nay</option><option value="history">Lịch sử · Hôm qua</option><option value="all">Tất cả thời gian</option></select></label><button type="button" className={styles.reset} title="Đặt lại bộ lọc" aria-label="Đặt lại bộ lọc" onClick={reset}><SlidersHorizontal size={16}/></button></div>
          <div id="session-results" role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.results}>
            {!rows.length ? <div className={styles.empty}><Search size={30}/><h2>Không tìm thấy bản ghi</h2><p>Thử thay đổi từ khóa hoặc bộ lọc.</p><PartnerButton variant="secondary" onClick={reset}>Đặt lại bộ lọc</PartnerButton></div> : cards ? <div className={styles.cards}>{rows.map(s=><article key={s.id}><div><button type="button" onClick={()=>openSession(s.id)} className={styles.code}>#{s.id}</button><PartnerBadge tone={tones[s.status]}>{statusLabels[s.status]}</PartnerBadge></div><h3>{s.plate}</h3><p>{s.customer} · {vehicleLabels[s.vehicle]}</p><dl><div><dt>Ô đỗ</dt><dd>{s.slotId}</dd></div><div><dt>Thời gian</dt><dd>{s.time}</dd></div><div><dt>Cọc / Phí</dt><dd>{money(s.status === "parked" || s.status === "completed" ? s.amount : s.deposit)}</dd></div></dl><PartnerButton variant="secondary" onClick={()=>openSession(s.id)}><Eye size={15}/>Xem chi tiết</PartnerButton></article>)}</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Biển số & xe</th><th>Ô đỗ</th><th>Khung giờ</th><th>Cọc / Phí</th><th>Trạng thái</th><th>Hạn đến</th><th>Thao tác</th></tr></thead><tbody>{rows.map(s=><tr key={s.id}><td><button type="button" className={styles.code} onClick={()=>openSession(s.id)}>#{s.id}</button></td><td><div className={styles.customer}><span>{s.customer.split(" ").map(n=>n[0]).slice(-2).join("")}</span><div><b>{s.customer}</b><small>{s.phone}</small></div></div></td><td><code className={styles.plate}>{s.plate}</code><small className={styles.vehicle}>{vehicleLabels[s.vehicle]}</small></td><td><span className={styles.slot}>{s.slotId}</span></td><td><span>{s.time}</span><small className={styles.muted}>{s.timeDetail}</small></td><td><span>{money(s.status === "parked" || s.status === "completed" ? s.amount : s.deposit)}</span><small className={clsx(styles.payment,s.status === "cancelled" && styles.refund)}>{payment(s)}</small></td><td><PartnerBadge tone={tones[s.status]}>{statusLabels[s.status]}</PartnerBadge></td><td><span className={s.status==="holding" ? styles.deadline : styles.muted}>{s.status==="holding" ? s.timeDetail : s.status==="confirmed" ? s.time.replace("Hẹn: ","") : "—"}</span>{s.status==="confirmed" && <small className={styles.deadline}>Chờ check-in</small>}</td><td><div className={styles.rowActions}><button type="button" aria-label={`Xem ${s.id}`} onClick={()=>openSession(s.id)}><Eye size={16}/></button>{["holding","confirmed"].includes(s.status) && <button type="button" aria-label={`Xử lý hủy ${s.id}`} onClick={()=>openSession(s.id)}><CircleX size={15}/></button>}</div></td></tr>)}</tbody></table></div>}
          </div>
          <div className={styles.pagination}><span role="status">Hiển thị {filtered.length ? (currentPage-1)*4+1 : 0}–{Math.min(currentPage*4,filtered.length)} trong tổng số <b>{filtered.length}</b> {tab==="reservations" ? "đơn đặt chỗ" : "phiên đỗ"}</span><nav aria-label="Phân trang"><button type="button" aria-label="Trang trước" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={16}/></button>{Array.from({length:Math.min(3,totalPages)},(_,i)=>Math.min(Math.max(1,currentPage-1),Math.max(1,totalPages-2))+i).map(p=><button type="button" key={p} aria-current={currentPage===p?"page":undefined} onClick={()=>setPage(p)}>{p}</button>)}<button type="button" aria-label="Trang sau" disabled={currentPage===totalPages} onClick={()=>setPage(currentPage+1)}><ChevronRight size={16}/></button></nav></div>
        </section>
        <p className={styles.demo}>Dữ liệu mẫu trong phiên trình duyệt · Thay đổi được đồng bộ với Tổng quan và Sơ đồ ô đỗ.</p>
      </main>
    </div>
    <Dialog title={panel==="details" ? `Chi tiết ${focusId ?? ""}` : panel==="locks" ? "Khóa ô khách vãng lai" : info} open={panel!==null} onClose={close} side={panel==="details"}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {panel==="details" && session && <SessionDetails key={session.id} session={session} onAction={action}/>}
      {panel==="locks" && <div className={styles.lockPanel}><p>Chọn ô trống để tạm ngưng nhận khách. Ô đang có xe hoặc giữ chỗ không thể khóa.</p><label>Ô trống<select value={lockSlot} onChange={e=>{setLockSlot(e.target.value);setLockConfirm(false);}}><option value="">Chọn ô đỗ</option>{available.map(s=><option key={s.id}>{s.id}</option>)}</select></label>{lockConfirm ? <div className={styles.confirm}><p>Khóa ô <b>{lockSlot}</b>? Sức chứa đang khai thác sẽ giảm 1 ô.</p><PartnerButton onClick={()=>changeLock(lockSlot,true)}>Xác nhận khóa ô</PartnerButton><PartnerButton variant="secondary" onClick={()=>setLockConfirm(false)}>Quay lại</PartnerButton></div> : <PartnerButton disabled={!lockSlot} onClick={()=>setLockConfirm(true)}><LockKeyhole size={15}/>Khóa ô đã chọn</PartnerButton>}<h3>Ô đang khóa ({locked.length})</h3>{locked.length ? locked.map(s=><div key={s.id} className={styles.lockRow}><span><LockKeyhole size={15}/>Ô {s.id}</span><PartnerButton variant="secondary" size="small" onClick={()=>changeLock(s.id,false)}>Mở khóa</PartnerButton></div>) : <p>Không có ô đang khóa.</p>}</div>}
      {panel==="info" && <><p>{info} sẽ được bổ sung khi kết nối hệ thống quản lý.</p><PartnerButton onClick={close}>Đã hiểu</PartnerButton></>}
    </Dialog>
    {notice && <div className={shell.toast} role="status"><CheckCircle2 size={18}/><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={()=>setNotice("")}><X size={16}/></button></div>}
  </div>;
}
