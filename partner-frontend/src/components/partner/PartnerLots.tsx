"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AlertCircle, ArrowRight, Building2, Car, CheckCircle2, Clock3, FileText, Grid3X3, ImagePlus, Info, Layers3, List, LockKeyhole, MapPin, MoreVertical, Pencil, Play, Plus, RefreshCw, Search, Settings, ShieldCheck, SquareParking, X, Zap } from "lucide-react";
import { defaultCover, lotStatusLabels, type LotInput, type LotStatus, type ManagedLot } from "@/lib/managed-lots";
import { summarizeLot, type VehicleKind } from "@/lib/overview-model";
import { usePartnerWorkspace } from "./PartnerWorkspace";
import { PartnerHeader, PartnerSidebar } from "./PartnerNavigation";
import PartnerDialog from "./PartnerDialog";
import { PartnerBadge, PartnerButton, type PartnerTone } from "./PartnerUI";
import shell from "./overview.module.css";
import tokens from "./partner.module.css";
import styles from "./lots.module.css";

type Panel = { type: "details" | "edit" | "pause" | "resume"; id: string } | { type: "create" } | { type: "info"; title: string; message: string } | null;
const statusTone: Record<LotStatus, PartnerTone> = { active: "success", pending: "warning", rejected: "danger", paused: "neutral" };
const vehicleNames: Record<VehicleKind, string> = { sedan: "Đến 4 chỗ", suv: "Đến 7 chỗ", ev: "Trạm sạc EV" };
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const hours = (lot: Pick<ManagedLot, "allDay" | "opens" | "closes">) => lot.allDay ? "24/7 (Cả ngày)" : `${lot.opens} – ${lot.closes}`;

function LotForm({ initial, busy, onSubmit, error }: { initial?: ManagedLot; busy: number; onSubmit: (input: LotInput) => void; error: string }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [area, setArea] = useState(initial?.area ?? "");
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? 100));
  const [opens, setOpens] = useState(initial?.opens ?? "06:00");
  const [closes, setCloses] = useState(initial?.closes ?? "22:00");
  const [allDay, setAllDay] = useState(initial?.allDay ?? false);
  const [vehicles, setVehicles] = useState<VehicleKind[]>(initial?.vehicles ?? ["sedan"]);
  const [cover, setCover] = useState(initial?.cover ?? defaultCover);
  const [fileError, setFileError] = useState("");
  const [readingImage, setReadingImage] = useState(false);
  const fileRequest = useRef(0);
  const capacityTooSmall = Number(capacity) < busy;
  function loadCover(file?: File) {
    const request = ++fileRequest.current;
    setFileError("");
    if (!file) { setReadingImage(false); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setFileError("Chọn ảnh JPG, PNG hoặc WebP, tối đa 2MB."); setReadingImage(false); return; }
    setReadingImage(true);
    const reader = new FileReader();
    reader.onload = () => { if (fileRequest.current === request) { setCover(String(reader.result)); setReadingImage(false); } };
    reader.onerror = () => { if (fileRequest.current === request) { setFileError("Không thể đọc ảnh. Vui lòng chọn lại."); setReadingImage(false); } };
    reader.readAsDataURL(file);
  }
  return <form className={styles.lotForm} onSubmit={event => { event.preventDefault(); onSubmit({ name, address, area, capacity: Number(capacity), opens, closes, allDay, vehicles, cover }); }}>
    <div className={styles.formNotice}><Info size={16} /><span>{initial?.status === "rejected" ? "Cập nhật thông tin và bổ sung hồ sơ trước khi gửi lại xét duyệt." : initial ? "Thay đổi thông tin bãi; các xe đang đỗ và giữ chỗ sẽ được giữ nguyên." : "Hồ sơ mới sẽ ở trạng thái chờ duyệt. Đây là thao tác minh họa, chưa gửi lên hệ thống thật."}</span></div>
    {initial?.status === "rejected" && <div className={styles.rejectedNote}><AlertCircle size={16} /><span>{initial.rejectionReason}</span></div>}
    <label>Tên bãi đỗ xe <em>*</em><input value={name} onChange={e => setName(e.target.value)} placeholder="Ví dụ: Bãi đỗ Trung tâm 2" required maxLength={100} /></label>
    <label>Địa chỉ <em>*</em><textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Số nhà, tên đường, phường, quận, thành phố" required maxLength={240} /></label>
    <div className={styles.formColumns}><label>Khu vực / Tầng <em>*</em><input value={area} onChange={e => setArea(e.target.value)} placeholder="Ví dụ: Hầm B1 & B2" required maxLength={60} /></label><label>Tổng sức chứa <em>*</em><input type="number" min={1} max={5000} step={1} value={capacity} onChange={e => setCapacity(e.target.value)} required aria-invalid={capacityTooSmall} /><small>{busy ? `Có ${busy} ô đang đỗ / giữ chỗ` : "Từ 1 đến 5.000 chỗ"}</small></label></div>
    {capacityTooSmall && <p className={styles.error} role="alert">Không thể giảm sức chứa xuống dưới {busy} ô đang đỗ / giữ chỗ.</p>}
    <fieldset className={styles.schedule}><legend>Giờ hoạt động</legend><label className={styles.checkLine}><input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />Mở cửa 24/7</label><div className={styles.formColumns}><label>Giờ mở cửa<input type="time" value={opens} onChange={e => setOpens(e.target.value)} disabled={allDay} required={!allDay} /></label><label>Giờ đóng cửa<input type="time" value={closes} onChange={e => setCloses(e.target.value)} disabled={allDay} required={!allDay} /></label></div>{!allDay && opens > closes && <small>Bãi hoạt động qua đêm đến ngày hôm sau.</small>}</fieldset>
    <fieldset className={styles.vehicleOptions}><legend>Loại phương tiện tiếp nhận <em>*</em></legend><div>{(["sedan", "suv", "ev"] as VehicleKind[]).map(kind => <label key={kind}><input type="checkbox" checked={vehicles.includes(kind)} onChange={e => setVehicles(e.target.checked ? [...vehicles, kind] : vehicles.filter(value => value !== kind))} />{kind === "ev" ? <Zap size={15} /> : <Car size={15} />}{vehicleNames[kind]}</label>)}</div></fieldset>
    <div className={styles.imageField}><span>Ảnh minh họa bãi đỗ</span><div><img src={cover} alt="Ảnh xem trước của bãi đỗ" width={300} height={176} /><label className={styles.filePicker}><ImagePlus size={19} /><span>{readingImage ? "Đang đọc ảnh..." : "Chọn ảnh từ máy"}</span><small>JPG, PNG, WebP · Tối đa 2MB</small><input type="file" aria-label="Chọn ảnh bãi đỗ" accept="image/png,image/jpeg,image/webp" onChange={e => loadCover(e.target.files?.[0])} /></label></div>{fileError && <p className={styles.error} role="alert">{fileError}</p>}</div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.formFooter}><span><ShieldCheck size={14} /> Dữ liệu mẫu trong phiên xem thử</span><PartnerButton type="submit" disabled={readingImage || capacityTooSmall}>{initial?.status === "rejected" ? "Gửi lại hồ sơ xét duyệt" : initial ? "Lưu thay đổi" : "Gửi hồ sơ bãi mới"}<ArrowRight size={15} /></PartnerButton></div>
  </form>;
}

export default function PartnerLots() {
  const { catalog, overviews, selectedId, selectLot, saveLot, transitionLot } = usePartnerWorkspace();
  const router = useRouter();
  const [filter, setFilter] = useState<LotStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [preview, setPreview] = useState<"normal" | "empty" | "loading">("normal");
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 4500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => () => { if (loadingTimer.current) clearTimeout(loadingTimer.current); }, []);
  useEffect(() => {
    if (!menuId) return;
    function closeMenu(event: PointerEvent) { if (!(event.target as Element).closest('[data-lot-menu]')) setMenuId(null); }
    function escapeMenu(event: KeyboardEvent) { if (event.key === "Escape") setMenuId(null); }
    document.addEventListener("pointerdown", closeMenu); document.addEventListener("keydown", escapeMenu);
    return () => { document.removeEventListener("pointerdown", closeMenu); document.removeEventListener("keydown", escapeMenu); };
  }, [menuId]);
  const filtered = useMemo(() => catalog.filter(lot => (filter === "all" || lot.status === filter) && (!query.trim() || fold(`${lot.name} ${lot.address} ${lot.code}`).includes(fold(query.trim())))), [catalog, filter, query]);
  const selected = panel && "id" in panel ? catalog.find(lot => lot.id === panel.id) : undefined;
  const selectedSummary = selected && overviews[selected.id] ? summarizeLot(overviews[selected.id]) : undefined;
  const busy = selectedSummary ? selectedSummary.occupied + selectedSummary.holding : 0;
  function open(next: Panel) { setPanel(next); setError(""); setMenuId(null); }
  function auxiliary(title: string) { setSidebarOpen(false); open({ type: "info", title, message: title === "Tài khoản đối tác" ? "Minh Trần · Quản lý bãi · haichau1@ezspace.vn. Đây là tài khoản minh họa của giao diện Partner." : `Mục ${title} đang được hoàn thiện. Hiện bạn có thể dùng Tổng quan và quản lý danh sách bãi đỗ.` }); }
  function reset() { setFilter("all"); setQuery(""); setPreview("normal"); }
  function showSkeleton() { if (loadingTimer.current) clearTimeout(loadingTimer.current); setPreview("loading"); loadingTimer.current = setTimeout(() => setPreview("normal"), 1100); }
  function submit(input: LotInput) {
    try { saveLot(input, panel?.type === "edit" ? panel.id : undefined, selected?.status === "rejected"); setPanel(null); reset(); setNotice(selected?.status === "rejected" ? "Đã gửi lại hồ sơ mẫu. Bãi chuyển sang chờ duyệt." : selected ? "Đã cập nhật thông tin bãi trong dữ liệu mẫu." : "Đã tạo hồ sơ bãi mới. Hồ sơ mẫu đang chờ xét duyệt."); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể lưu thông tin bãi."); }
  }
  function changeStatus() {
    if (!selected || (panel?.type !== "pause" && panel?.type !== "resume")) return;
    try { transitionLot(selected.id, panel.type); setPanel(null); setNotice(panel.type === "pause" ? "Bãi đã tạm ngưng nhận xe mới trong dữ liệu mẫu." : "Bãi đã hoạt động trở lại trong dữ liệu mẫu."); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Không thể thay đổi trạng thái bãi."); }
  }
  function visitOverview(lot: ManagedLot) { selectLot(lot.id); router.push("/"); }
  function card(lot: ManagedLot) {
    const stats = overviews[lot.id] ? summarizeLot(overviews[lot.id]) : undefined;
    return <article key={lot.id} className={clsx(styles.lotCard, styles[lot.status])} aria-label={lot.name}>
      <div className={styles.cover}><img src={lot.cover} alt={`Ảnh minh họa ${lot.name}`} width={300} height={176} /><span className={styles.coverShade} /><div className={styles.coverBadges}><span className={styles.solidBadge}><i />{lotStatusLabels[lot.status]}</span><span className={styles.lotCode}>ID: {lot.code}</span></div><div className={styles.cardMenu} data-lot-menu><button type="button" aria-label={`Tùy chọn ${lot.name}`} aria-expanded={menuId === lot.id} onClick={() => setMenuId(menuId === lot.id ? null : lot.id)}><MoreVertical size={17} /></button>{menuId === lot.id && <div className={styles.menuPanel}><button type="button" onClick={() => open({ type: "details", id: lot.id })}><FileText size={14} />Xem chi tiết</button>{lot.status !== "pending" && <button type="button" onClick={() => open({ type: "edit", id: lot.id })}><Pencil size={14} />{lot.status === "rejected" ? "Chỉnh sửa & gửi lại" : "Sửa thông tin"}</button>}{lot.status === "active" && <button type="button" onClick={() => open({ type: "pause", id: lot.id })}><LockKeyhole size={14} />Tạm ngưng nhận xe</button>}{lot.status === "paused" && <button type="button" onClick={() => open({ type: "resume", id: lot.id })}><Play size={14} />Kích hoạt lại</button>}</div>}</div><div className={styles.coverTitle}><span>{lot.area}</span><h2>{lot.name}</h2></div></div>
      {lot.status === "pending" && <div className={styles.pendingNote}><Clock3 size={16} /><span>Đang chờ quản trị viên EZ-Space kiểm tra PCCC & cổng Barrier</span></div>}
      {lot.status === "rejected" && <div className={styles.rejectedNote}><AlertCircle size={16} /><div><strong>Bị từ chối bởi Quản trị viên</strong><p>“{lot.rejectionReason}”</p></div></div>}
      {lot.status === "paused" && <div className={styles.pausedNote}><Info size={15} /><span>Ngưng tiếp nhận đặt chỗ mới trong thời gian tạm ngưng hoạt động.</span></div>}
      <div className={styles.cardBody}><p className={styles.address} title={lot.address}><MapPin size={15} /><span>{lot.address}</span></p><div className={styles.metrics}><div><Clock3 size={15} /><span>Giờ {lot.status === "rejected" ? "đăng ký" : "mở cửa"}<strong>{hours(lot)}</strong></span></div><div><SquareParking size={15} /><span>{lot.status === "rejected" ? "Sức chứa đăng ký" : "Tổng sức chứa"}<strong>{lot.capacity} chỗ</strong></span></div></div><div className={styles.vehicleChips}><p>Loại xe hỗ trợ:</p><div>{lot.vehicles.map(kind => <span key={kind} className={kind === "ev" ? styles.evChip : undefined}>{kind === "ev" ? <Zap size={13} /> : <Car size={13} />}{vehicleNames[kind]}</span>)}</div></div>
        {lot.status === "active" && stats && <div className={styles.occupancy}><div><span>Tình trạng đỗ trực tiếp</span><strong>Đang trống {stats.available}/{lot.capacity}</strong></div><div className={styles.occupancyBar} role="img" aria-label={`${stats.available} ô trống, ${stats.holding} ô đang giữ và ${stats.occupied} ô đang đỗ`}><i style={{ width: `${stats.occupied / lot.capacity * 100}%` }} /><i style={{ width: `${stats.holding / lot.capacity * 100}%` }} /><i style={{ width: `${stats.available / lot.capacity * 100}%` }} /></div><div className={styles.occupancyLegend}><span><i />Đỗ</span><span><i />Giữ</span><span><i />Trống</span></div></div>}
        {lot.status === "pending" && <div className={styles.submitted}><span>Gửi duyệt lúc: <strong>{lot.submittedAt}</strong></span><b>Ước tính &lt;24h</b></div>}
      </div>
      <footer className={styles.cardFooter}>{lot.status === "active" ? <><button type="button" className={styles.textAction} onClick={() => open({ type: "edit", id: lot.id })}><SettingsIcon />Cấu hình bãi</button><div><button type="button" className={styles.lockAction} onClick={() => open({ type: "pause", id: lot.id })} aria-label={`Tạm ngưng ${lot.name}`}><LockKeyhole size={12} />Khóa</button><PartnerButton size="small" onClick={() => open({ type: "details", id: lot.id })}>Chi tiết</PartnerButton></div></> : lot.status === "pending" ? <><span>Chưa hoàn tất cài đặt</span><PartnerButton size="small" variant="secondary" onClick={() => open({ type: "details", id: lot.id })}>Xem hồ sơ</PartnerButton></> : lot.status === "rejected" ? <><button type="button" className={styles.contactAction} onClick={() => open({ type: "info", title: "Thông tin hỗ trợ", message: "Hãy bổ sung hình ảnh camera cổng vào và hồ sơ PCCC theo lý do từ chối, rồi chọn Chỉnh sửa & gửi lại. Đây là thông tin hồ sơ mẫu, chưa gửi yêu cầu hỗ trợ thật." })}>Liên hệ quản trị</button><PartnerButton size="small" variant="danger" onClick={() => open({ type: "edit", id: lot.id })}><Pencil size={12} />Chỉnh sửa & gửi lại</PartnerButton></> : <><button type="button" className={styles.textAction} onClick={() => open({ type: "details", id: lot.id })}>Chi tiết</button><PartnerButton size="small" className={styles.resumeButton} onClick={() => open({ type: "resume", id: lot.id })}><Play size={12} />Kích hoạt lại</PartnerButton></>}</footer>
    </article>;
  }
  const title = panel?.type === "create" ? "Đăng ký bãi đỗ mới" : panel?.type === "edit" ? selected?.status === "rejected" ? "Chỉnh sửa & gửi lại hồ sơ" : "Chỉnh sửa thông tin bãi" : panel?.type === "pause" ? "Tạm ngưng nhận xe mới?" : panel?.type === "resume" ? "Kích hoạt lại bãi đỗ?" : panel?.type === "details" ? "Chi tiết bãi đỗ" : panel?.type === "info" ? panel.title : "";
  return <div className={clsx(tokens.partner, shell.shell, styles.lotsShell, compact && shell.compact, compact && styles.compactPage, sidebarCollapsed && shell.collapsed)}>
    <PartnerSidebar active="lots" open={sidebarOpen} collapsed={sidebarCollapsed} onClose={() => setSidebarOpen(false)} onCollapse={() => setSidebarCollapsed(value => !value)} onAuxiliary={auxiliary} />
    <div className={shell.workspace}><PartnerHeader page="lots" compact={compact} onCompact={setCompact} onMenu={() => setSidebarOpen(true)} selectedId={selectedId} onSelect={selectLot} lots={catalog.filter(lot => ["active", "paused"].includes(lot.status))} onNotifications={() => open({ type: "info", title: "Thông báo hồ sơ bãi", message: `Hiện có ${catalog.filter(lot => lot.status === "pending").length} hồ sơ mẫu đang chờ duyệt và ${catalog.filter(lot => lot.status === "rejected").length} hồ sơ cần bổ sung thông tin.` })} onProfile={() => auxiliary("Tài khoản đối tác")} />
      <div className={styles.content}><div className={styles.pageHeading}><div><h1>Bãi đỗ xe của tôi</h1><p>Quản lý danh sách, cấu hình sức chứa, sơ đồ và loại phương tiện được tiếp nhận</p></div><div className={styles.headerActions}><PartnerButton variant="secondary" size="small" onClick={() => setPreview(preview === "empty" ? "normal" : "empty")}><ImagePlus size={13} />{preview === "empty" ? "Xem danh sách" : "Xem trống"}</PartnerButton><PartnerButton variant="secondary" size="small" onClick={showSkeleton}><Layers3 size={13} />Skeleton</PartnerButton><PartnerButton onClick={() => open({ type: "create" })}><Plus size={16} />Đăng ký bãi mới</PartnerButton></div></div>
        <div className={styles.filterBar}><div className={styles.statusFilters} aria-label="Lọc trạng thái bãi đỗ">{([["all", "Tất cả"], ["active", "Đang hoạt động"], ["pending", "Chờ duyệt"], ["paused", "Tạm ngưng"], ["rejected", "Bị từ chối"]] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPreview("normal"); setMenuId(null); }} className={value !== "all" ? styles[`${value}Filter`] : undefined}>{label}<span>{value === "all" ? catalog.length : catalog.filter(lot => lot.status === value).length}</span></button>)}</div><div className={styles.searchControls}><label className={styles.search}><Search size={14} /><input aria-label="Tìm bãi đỗ" placeholder="Tìm theo tên hoặc địa chỉ..." value={query} onChange={e => { setQuery(e.target.value); setPreview("normal"); }} />{query && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}><X size={13} /></button>}</label><div className={styles.viewToggle} aria-label="Kiểu hiển thị bãi"><button type="button" aria-label="Xem dạng lưới" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Grid3X3 size={16} /></button><button type="button" aria-label="Xem dạng danh sách" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={17} /></button></div></div></div>
        {preview === "loading" ? <div className={styles.grid} aria-label="Đang tải danh sách bãi" aria-busy="true">{[1, 2, 3].map(id => <div className={styles.skeleton} key={id}><div /><span /><span /><section><i /><i /></section><span /><span /><button type="button" disabled aria-label="Đang tải" /></div>)}</div> : preview === "empty" || !filtered.length ? <section className={styles.emptyState}><span><Building2 size={38} /></span><h2>{preview === "empty" ? "Chưa có bãi đỗ nào" : "Không tìm thấy bãi đỗ phù hợp"}</h2><p>{preview === "empty" ? "Đăng ký bãi đầu tiên để bắt đầu quản lý chỗ đỗ và tiếp nhận khách hàng." : "Thử thay đổi từ khóa hoặc chọn trạng thái khác."}</p><div><PartnerButton variant="secondary" onClick={reset}>Trở lại danh sách</PartnerButton><PartnerButton onClick={() => open({ type: "create" })}><Plus size={16} />Đăng ký bãi mới</PartnerButton></div></section> : <div className={clsx(styles.grid, view === "list" && styles.list)}>{filtered.map(card)}</div>}
        <footer className={styles.pageFooter}><span><ShieldCheck size={13} />Dữ liệu mẫu trong phiên xem thử · Hồ sơ chưa gửi đến quản trị viên thật</span><span>{preview === "normal" ? filtered.length : 0} / {catalog.length} bãi đỗ</span></footer>
      </div>
    </div>
    <PartnerDialog open={panel !== null} title={title} side={panel?.type === "details"} onClose={() => setPanel(null)}>
      {(panel?.type === "create" || panel?.type === "edit") && <LotForm key={panel.type === "create" ? "new" : panel.id} initial={panel.type === "edit" ? selected : undefined} busy={busy} onSubmit={submit} error={error} />}
      {panel?.type === "details" && selected && <div className={styles.details}><img src={selected.cover} alt={`Ảnh minh họa ${selected.name}`} width={300} height={176} /><PartnerBadge tone={statusTone[selected.status]}>{lotStatusLabels[selected.status]}</PartnerBadge><h3>{selected.name}</h3><p><MapPin size={15} />{selected.address}</p><dl><div><dt>Mã bãi</dt><dd>{selected.code}</dd></div><div><dt>Khu vực / Tầng</dt><dd>{selected.area}</dd></div><div><dt>Giờ hoạt động</dt><dd>{hours(selected)}</dd></div><div><dt>Sức chứa đăng ký</dt><dd>{selected.capacity} chỗ</dd></div><div><dt>Loại xe</dt><dd>{selected.vehicles.map(kind => vehicleNames[kind]).join(", ")}</dd></div>{selectedSummary && <><div><dt>Đang trống</dt><dd>{selectedSummary.available} chỗ</dd></div><div><dt>Đang đỗ / giữ chỗ</dt><dd>{selectedSummary.occupied} / {selectedSummary.holding}</dd></div></>}{selected.submittedAt && <div><dt>Gửi duyệt lúc</dt><dd>{selected.submittedAt}</dd></div>}</dl>{selected.rejectionReason && <div className={styles.rejectedNote}><AlertCircle size={16} /><span>{selected.rejectionReason}</span></div>}{selected.status === "pending" && <div className={styles.pendingNote}><Clock3 size={16} />Hồ sơ đang chờ kiểm tra. Các thao tác vận hành chưa khả dụng.</div>}<div className={styles.detailActions}>{["active", "paused"].includes(selected.status) && <PartnerButton onClick={() => visitOverview(selected)}><Building2 size={15} />Xem Tổng quan bãi</PartnerButton>}{selected.status !== "pending" && <PartnerButton variant="secondary" onClick={() => open({ type: "edit", id: selected.id })}><Pencil size={15} />{selected.status === "rejected" ? "Chỉnh sửa & gửi lại" : "Sửa thông tin"}</PartnerButton>}</div></div>}
      {(panel?.type === "pause" || panel?.type === "resume") && selected && <div className={styles.confirmation}><span className={styles.confirmIcon}>{panel.type === "pause" ? <LockKeyhole size={26} /> : <Play size={26} />}</span><h3>{selected.name}</h3><p>{panel.type === "pause" ? "Bãi sẽ tạm ngưng tiếp nhận xe mới. Các xe đang đỗ và giữ chỗ hiện tại vẫn được giữ nguyên để tiếp tục xử lý." : "Bãi đã được duyệt trước đó sẽ hoạt động trở lại và có thể tiếp nhận xe mới."}</p>{error && <p className={styles.error} role="alert">{error}</p>}<div><PartnerButton variant="secondary" onClick={() => setPanel(null)}>Quay lại</PartnerButton><PartnerButton variant={panel.type === "pause" ? "danger" : "primary"} onClick={changeStatus}>{panel.type === "pause" ? "Xác nhận tạm ngưng" : "Xác nhận kích hoạt"}</PartnerButton></div><small>Thao tác mẫu, không thay đổi trạng thái bãi thực tế.</small></div>}
      {panel?.type === "info" && <div className={styles.information}><Info size={30} /><p>{panel.message}</p><PartnerButton variant="secondary" onClick={() => setPanel(null)}>Đã hiểu</PartnerButton></div>}
    </PartnerDialog>
    {notice && <div className={shell.toast} role="status"><CheckCircle2 size={18} /><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setNotice("")}><X size={17} /></button></div>}
  </div>;
}

function SettingsIcon() { return <Settings size={13} aria-hidden="true" />; }
