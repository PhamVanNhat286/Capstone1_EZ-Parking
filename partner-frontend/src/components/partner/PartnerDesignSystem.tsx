"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Car, Check, CircleCheck, Clock3, Copy, Download, Info, Layers3, Palette, Plus, ShieldCheck, SquareParking, Trash2, TrendingUp, X, Zap } from "lucide-react";
import { PartnerBadge, PartnerButton, PartnerKpi, PartnerSlot, type PartnerTone, type SlotState } from "./PartnerUI";
import styles from "./partner.module.css";

const palettes = [
  { title: "PRIMARY BRAND", rows: [["Primary (#2563EB)", "Default", "#2563EB", false], ["Hover (#1D4ED8)", "Hover", "#1D4ED8", false], ["Pressed (#1E40AF)", "Active", "#1E40AF", false], ["Tint (#EFF6FF)", "Bg / Badge", "#EFF6FF", true]] },
  { title: "NEUTRALS (SLATE)", rows: [["Text Primary (#0F172A)", "900", "#0F172A", false], ["Text Secondary (#475569)", "600", "#475569", false], ["Text Muted (#94A3B8)", "400", "#94A3B8", true], ["Page Bg (#F8FAFC)", "50", "#F8FAFC", true]] },
  { title: "SEMANTIC STATES", rows: [["Success (#16A34A)", "Hoạt động", "#16A34A", false], ["Warning (#D97706)", "Chờ duyệt", "#D97706", false], ["Danger (#DC2626)", "Từ chối / Hủy", "#DC2626", false], ["Info (#2563EB)", "Thông báo", "#2563EB", false]] },
  { title: "Ô ĐỖ (RESERVED SLOTS ONLY)", rows: [["Available (#22C55E)", "Trống", "#22C55E", true], ["Holding (#FACC15)", "Đang giữ chỗ", "#FACC15", true], ["Occupied (#EF4444)", "Đang đỗ", "#EF4444", false], ["Locked (#CBD5E1)", "Khóa / Bảo trì", "#CBD5E1", true]] },
] as const;

const typeSamples = [
  ["Display 28/36 (800)", "Tiêu đề số đo KPI lớn, bảng điện tử bãi", 28, 36, 800],
  ["Heading 1 24/32 (700)", "Tiêu đề trang tổng quan & cấu hình bãi", 24, 32, 700],
  ["Heading 2 20/28 (700)", "Tiêu đề các khối card & bảng số liệu", 20, 28, 700],
  ["Heading 3 16/24 (600)", "Tiêu đề phụ, nhãn nhóm trường dữ liệu", 16, 24, 600],
  ["Body 14/20 Regular (400 / 500)", "Văn bản nội dung, ô nhập liệu, danh sách dòng", 14, 20, 400],
  ["Caption 12/16 (500 / 600)", "Ghi chú chân thẻ, nhãn phụ, ngày giờ, badge", 12, 16, 500],
] as const;

function Section({ title, icon, children, id }: { title: string; icon: ReactNode; children: ReactNode; id: string }) {
  return <section className={styles.section} aria-labelledby={id}>
    <h2 id={id} className={styles.sectionTitle}><span>{icon}</span>{title}</h2>{children}
  </section>;
}

function ConfirmationForm({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(false);
  const reasonId = useId();
  return <form onSubmit={event => {
    event.preventDefault();
    if (!reason.trim()) { setError(true); return; }
    onConfirm(reason.trim()); setReason(""); setError(false);
  }}>
    <div className={styles.confirmTitle}><span className={styles.dangerIcon}><AlertTriangle size={22} /></span><h3>Xác nhận hủy đặt chỗ?</h3></div>
    <p className={styles.confirmText}>Hành động này sẽ giải phóng ô đỗ A-02 và hoàn tiền cọc tự động cho khách hàng. Vui lòng nhập lý do bắt buộc để ghi log kiểm toán.</p>
    <label className={styles.srOnly} htmlFor={reasonId}>Lý do hủy đặt chỗ</label>
    <textarea id={reasonId} value={reason} onChange={e => { setReason(e.target.value); setError(false); }} placeholder="Nhập lý do thao tác (bắt buộc)..." aria-invalid={error} aria-describedby={error ? `${reasonId}-error` : undefined} />
    {error && <p id={`${reasonId}-error`} className={styles.fieldError} role="alert">Vui lòng nhập lý do trước khi xác nhận.</p>}
    <div className={styles.confirmActions}><PartnerButton variant="secondary" onClick={onCancel}>Quay lại</PartnerButton><PartnerButton type="submit" variant="danger">Xác nhận hủy</PartnerButton></div>
  </form>;
}

export default function PartnerDesignSystem() {
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [capacity, setCapacity] = useState("-10");
  const [selectedSlot, setSelectedSlot] = useState("A-05");
  const [vehicles, setVehicles] = useState(["Sedan 4 chỗ", "SUV 7 chỗ"]);
  const [showAlert, setShowAlert] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const capacityInvalid = !/^\d+$/.test(capacity) || Number(capacity) < 1;

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => () => { if (loadingTimer.current) clearTimeout(loadingTimer.current); }, []);
  useEffect(() => {
    if (modalOpen && !dialogRef.current?.open) dialogRef.current?.showModal();
    else if (!modalOpen && dialogRef.current?.open) dialogRef.current.close();
  }, [modalOpen]);

  async function copyColor(color: string) {
    try { await navigator.clipboard.writeText(color); setNotice(`Đã sao chép mã màu ${color}`); }
    catch { setNotice(`Mã màu: ${color}`); }
  }
  function demoLoad() {
    setLoading(true);
    loadingTimer.current = setTimeout(() => { setLoading(false); setNotice("Đã hoàn tất thao tác mẫu."); }, 1400);
  }
  function confirmCancellation(reason: string) {
    setModalOpen(false);
    setNotice(`Đã xác nhận hủy mẫu A-02. Lý do: ${reason}. Không thay đổi dữ liệu thực tế.`);
  }

  return <div className={styles.partner}>
    <div className={styles.designPage}>
      <header className={styles.intro}>
        <div className={styles.introIdentity}><span className={styles.logo}>P</span><div><h1>EZ-Space Partner Design System & Guidelines</h1><p>Bộ quy chuẩn nhận diện & Hệ thống linh kiện giao diện bảng điều khiển dành cho Chủ bãi đỗ xe</p></div></div>
        <div className={styles.introBadges}><span><CircleCheck size={13} /> Chuẩn Light Mode 100%</span><span>v1.0 Ready for Development</span></div>
      </header>

      <Section id="partner-tokens" title="1. Bảng mã màu Tokens (Color & Typography Scale)" icon={<Palette size={19} />}>
        <div className={styles.paletteGrid}>{palettes.map(palette => <article className={styles.paletteCard} key={palette.title}>
          <div className={styles.paletteHeading}><h3>{palette.title}</h3>{palette.title.startsWith("Ô ĐỖ") && <span>Chỉ dùng cho ô đỗ</span>}</div>
          <div className={styles.swatches}>{palette.rows.map(([label, caption, color, darkText]) => <button type="button" title={`Sao chép ${color}`} aria-label={`Sao chép màu ${label}`} key={label} className={styles.swatch} onClick={() => copyColor(color)} style={{ backgroundColor: color, color: darkText ? "#0F172A" : "#FFFFFF" }}><span>{label}</span><span>{caption}</span><Copy size={11} className={styles.copyIcon} /></button>)}</div>
        </article>)}</div>
        <article className={styles.typography}><h3 className={styles.eyebrow}>THANG BẬC TYPOGRAPHY (PLUS JAKARTA SANS)</h3><div className={styles.typeGrid}>{typeSamples.map(([label, description, fontSize, lineHeight, fontWeight]) => <div className={styles.typeSample} key={label}><p style={{ fontSize, lineHeight: `${lineHeight}px`, fontWeight }}>{label}</p><span>{description}</span></div>)}</div></article>
      </Section>

      <Section id="partner-components" title="2. Thư viện Linh Kiện (Component States & Variations)" icon={<Layers3 size={20} />}>
        <div className={styles.twoColumns}>
          <article className={`${styles.card} ${styles.controlsCard}`}><h3 className={styles.eyebrow}>BUTTONS & ACTION STATES</h3>
            <p className={styles.groupLabel}>Primary Buttons:</p><div className={styles.buttonRow}>
              <PartnerButton onClick={() => setNotice("Nút tạo bãi mới đã được kiểm tra. Biểu mẫu tạo bãi sẽ có ở frame Quản lý bãi đỗ.")}><Plus size={16} /> Tạo bãi mới</PartnerButton>
              <PartnerButton demoState="hover" onClick={() => setNotice("Trạng thái hover: #1D4ED8")}>Hover state</PartnerButton>
              <PartnerButton demoState="pressed" onClick={() => setNotice("Trạng thái nhấn: #1E40AF")}>Pressed</PartnerButton>
            </div><div className={styles.buttonRow}><PartnerButton disabled><Plus size={16} /> Disabled</PartnerButton><PartnerButton loading={loading} onClick={demoLoad}>{loading ? "Đang xử lý..." : "Thử trạng thái tải"}</PartnerButton></div>
            <p className={styles.groupLabel}>Secondary / Ghost / Danger:</p><div className={styles.buttonRow}><PartnerButton variant="secondary" onClick={() => setNotice("Đây là dữ liệu giao diện mẫu, chưa có báo cáo để xuất.")}><Download size={16} /> Xuất báo cáo</PartnerButton><PartnerButton variant="ghost" onClick={() => setNotice("Đã hủy thao tác mẫu.")}>Hủy bỏ</PartnerButton><PartnerButton variant="danger" onClick={() => setModalOpen(true)}><Trash2 size={15} /> Hủy đặt chỗ</PartnerButton></div>
            <div className={styles.sizeGroup}><p className={styles.groupLabel}>Sizes (S, M, L):</p><div className={styles.buttonRow}><PartnerButton size="small" onClick={() => setNotice("Nút Small: cao 32px.")}>Small (32px)</PartnerButton><PartnerButton onClick={() => setNotice("Nút Medium: cao 40px.")}>Medium (40px)</PartnerButton><PartnerButton size="large" onClick={() => setNotice("Nút Large: cao 48px.")}>Large (48px)</PartnerButton></div></div>
          </article>
          <article className={`${styles.card} ${styles.controlsCard}`}><h3 className={styles.eyebrow}>FORM INPUTS & PICKERS</h3>
            <div className={styles.fields}>
              <label className={styles.field}>Tên bãi đỗ xe <em>*</em><input defaultValue="Bãi đỗ xe trung tâm Hải Châu 1" /><small>Tên bãi sẽ hiển thị trên ứng dụng khách hàng</small></label>
              <label className={styles.field}>Giá cọc tiêu chuẩn<span className={styles.unitInput}><input aria-label="Giá cọc tiêu chuẩn" type="text" inputMode="numeric" defaultValue="50.000" /><span>VNĐ</span></span><small>Số tiền thanh toán trước để giữ chỗ</small></label>
              <div className={styles.fieldPair}><label className={styles.field}>Khu vực / Tầng<select defaultValue="A"><option value="A">Khu A - Tầng trệt (48 chỗ)</option><option value="B">Khu B - Tầng lửng (36 chỗ)</option><option value="C">Khu C - Tầng hầm B1 (36 chỗ)</option></select></label>
                <label className={styles.field}>Sức chứa tối đa<input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} aria-invalid={capacityInvalid} aria-describedby="partner-capacity-hint" /><small id="partner-capacity-hint" className={capacityInvalid ? styles.fieldError : undefined}>{capacityInvalid ? "Sức chứa phải lớn hơn 0" : "Giá trị sức chứa hợp lệ"}</small></label></div>
              <fieldset className={styles.vehicles}><legend>Loại phương tiện phục vụ:</legend><div>{["Sedan 4 chỗ", "SUV 7 chỗ", "Xe điện EV"].map((name, index) => <label key={name}><input type="checkbox" checked={vehicles.includes(name)} onChange={e => setVehicles(e.target.checked ? [...vehicles, name] : vehicles.filter(v => v !== name))} />{index === 2 ? <Zap size={15} /> : <Car size={15} />}{name}</label>)}</div></fieldset>
            </div>
          </article>
        </div>
        <div className={styles.twoColumns}>
          <article className={`${styles.card} ${styles.statusCard}`}><h3 className={styles.eyebrow}>HỆ THỐNG HUY HIỆU TRẠNG THÁI (STATUS PILLS)</h3>
            {([
              ["Bãi đỗ status", [["Đang hoạt động", "success"], ["Chờ duyệt", "warning"], ["Bị từ chối", "danger"], ["Tạm ngưng", "neutral"]]],
              ["Đặt chỗ status", [["Đang giữ chỗ", "warning"], ["Đã xác nhận", "info"], ["Đã hủy", "danger"], ["Quá hạn", "neutral"]]],
              ["Phiên đỗ status", [["Đang đỗ", "info"], ["Đã rời bãi", "success"], ["Quá giờ", "danger"]]],
            ] as [string, [string, PartnerTone][]][]).map(([label, badges]) => <div className={styles.badgeGroup} key={label}><p className={styles.groupLabel}>{label}</p><div>{badges.map(([name, tone]) => <PartnerBadge tone={tone} key={name}>{name}</PartnerBadge>)}</div></div>)}
          </article>
          <article className={`${styles.card} ${styles.statusCard}`}><h3 className={styles.eyebrow}>PARKING SLOT CELL COMPONENT (56×56) & LEGEND</h3><div className={styles.legend}>{[["available", "Trống"], ["holding", "Giữ chỗ"], ["occupied", "Đang đỗ"], ["locked", "Khóa / Bảo trì"]].map(([state, label]) => <span key={state}><i className={styles[state]} />{label}</span>)}</div>
            <div className={styles.slotExamples}>{([['A-01', 'available', 'Available'], ['A-02', 'holding', 'Holding'], ['A-03', 'occupied', 'Occupied'], ['A-04', 'locked', 'Unavailable'], ['A-05', 'available', 'Selected']] as [string, SlotState, string][]).map(([code, state, label]) => <div key={code}><PartnerSlot code={code} state={state} selected={selectedSlot === code} onClick={() => setSelectedSlot(code)} /><small>{label}</small></div>)}</div>
            <div className={styles.slotNote}><Info size={15} /><span>Nhấn ô trống để xem trạng thái chọn. Ô đang giữ, đang đỗ và bảo trì không thể chọn.</span></div>
            <p className={styles.selectionStatus} aria-live="polite"><Check size={14} /> Ô đang chọn: <strong>{selectedSlot}</strong></p>
          </article>
        </div>
      </Section>

      <Section id="partner-patterns" title="3. KPI Cards, Alerts & Feedback" icon={<SquareParking size={20} />}>
        {showAlert ? <div className={styles.alert}><AlertTriangle size={23} /><div><strong>Bãi xe đang chờ xét duyệt từ Quản trị viên EZ-Space</strong><p>Bạn có thể cấu hình sơ đồ ô đỗ và bảng giá trong thời gian chờ duyệt.</p></div><PartnerButton variant="ghost" size="small" onClick={() => setShowAlert(false)}>Đã hiểu <X size={13} /></PartnerButton></div> : <div className={styles.alertRestore}><Info size={16} /><span>Thông báo đã được đóng.</span><PartnerButton variant="ghost" size="small" onClick={() => setShowAlert(true)}>Hiện lại thông báo</PartnerButton></div>}
        <div className={styles.kpiGrid}>
          <PartnerKpi label="Tổng sức chứa" value="120" unit="chỗ" tone="info" icon={<Layers3 size={19} />} footnote={<><span className={styles.trend}><TrendingUp size={12} /> +12 chỗ</span><span>Tầng B1 vừa kích hoạt</span></>} />
          <PartnerKpi label="Đang trống" value="42" unit="chỗ" tone="success" icon={<CircleCheck size={19} />} footnote={<><PartnerBadge tone="success">Tỉ lệ trống 35%</PartnerBadge><span>Sẵn sàng đón xe</span></>} />
          <PartnerKpi label="Đang giữ chỗ (Holding)" value="18" unit="xe" tone="warning" icon={<Clock3 size={19} />} footnote={<><PartnerBadge tone="warning">Đến 15–20p</PartnerBadge><span>Cọc: 900.000đ</span></>} />
          <PartnerKpi label="Đang đỗ thực tế" value="60" unit="xe" tone="neutral" icon={<Car size={19} />} footnote={<><PartnerBadge>Công suất 50%</PartnerBadge><span>Tạm thu: 4.850.000đ</span></>} />
        </div>
        <div className={styles.twoColumns}>
          <article className={`${styles.card} ${styles.skeletonCard}`}><h3 className={styles.eyebrow}>SKELETON LOADER STATE</h3><div className={styles.skeletonContent} role="img" aria-label="Mẫu giao diện đang tải dữ liệu"><div className={styles.skeletonHead}><span /><div><span /><span /></div></div><div className={styles.skeletonTiles}>{[1, 2, 3].map(n => <span key={n} />)}</div>{[1, 2, 3].map(n => <div className={styles.skeletonRow} key={n}><span /><span /><span /></div>)}</div><p className={styles.helpText}>Hiển thị khung chờ khi đang tải dữ liệu từ hệ thống.</p></article>
          <article className={`${styles.card} ${styles.confirmCard}`}><ConfirmationForm key={formVersion} onCancel={() => { setFormVersion(v => v + 1); setNotice("Đã hủy thao tác mẫu."); }} onConfirm={confirmCancellation} /></article>
        </div>
      </Section>
      <footer className={styles.footer}><ShieldCheck size={15} /><span>EZ-Space Partner • Design System v1.0 • Light Mode • Plus Jakarta Sans</span><a href="https://www.figma.com/design/3heUuXWQXhGGaOUY9o4i3V/Untitled?node-id=1-2" target="_blank" rel="noreferrer">Xem thiết kế <ArrowRight size={13} /></a></footer>
    </div>
    {notice && <div className={styles.notice} role="status"><CircleCheck size={18} /><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={() => setNotice("")}><X size={17} /></button></div>}
    <dialog ref={dialogRef} className={styles.dialog} aria-label="Xác nhận hủy đặt chỗ" onCancel={() => setModalOpen(false)} onClose={() => setModalOpen(false)} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}><div className={styles.dialogInner}><button type="button" className={styles.dialogClose} aria-label="Đóng hộp thoại" onClick={() => setModalOpen(false)}><X size={19} /></button><ConfirmationForm onCancel={() => setModalOpen(false)} onConfirm={confirmCancellation} /></div></dialog>
  </div>;
}
