"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, ArrowLeft, Camera, Car, Check, CheckCircle2, ChevronDown, Clock3, Expand, History, Keyboard, LoaderCircle, LogIn, LogOut, Menu, QrCode, RefreshCw, ScanLine, ShieldCheck, Upload, UserRound, Volume2, VolumeX, X } from "lucide-react";
import { usePartnerWorkspace } from "./PartnerWorkspace";
import { PartnerSidebar } from "./PartnerNavigation";
import { PartnerBadge, PartnerButton } from "./PartnerUI";
import Dialog from "./PartnerDialog";
import { money, transitionSession } from "@/lib/overview-model";
import { inspectGateTicket, type GateMode, type GateResult } from "@/lib/gate-kiosk";
import tokens from "./partner.module.css";
import shell from "./overview.module.css";
import styles from "./kiosk.module.css";

type ScanRecord = { id: number; time: string; result: GateResult; completed: boolean };
type Detector = { detect(source: HTMLVideoElement | ImageBitmap): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
const getDetector = () => (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
const scenarios = ["Check-in hợp lệ", "Check-out hợp lệ", "Check-out thu thêm", "Vé hết hạn / hủy", "Sai cổng vào / ra", "Đang kiểm tra", "Reset (Sẵn sàng)"];

export default function PartnerKiosk() {
  const { catalog, selectedId, selectLot, overviews, setOverviews } = usePartnerWorkspace();
  const lot = overviews[selectedId];
  const profile = catalog.find(l => l.id === selectedId)!;
  const [mode, setMode] = useState<GateMode>("in");
  const [inputMode, setInputMode] = useState<"camera" | "manual" | "upload">("camera");
  const [ticket, setTicket] = useState("");
  const [result, setResult] = useState<GateResult | null>(null);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [currentRecord, setCurrentRecord] = useState<number | null>(null);
  const [navOpen, setNavOpen] = useState(false), [collapsed, setCollapsed] = useState(false);
  const [muted, setMuted] = useState(true), [full, setFull] = useState(false);
  const [clock, setClock] = useState<Date | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [dialog, setDialog] = useState<string | null>(null);
  const [incident, setIncident] = useState("");
  const [notice, setNotice] = useState("");
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null);
  const busyRef = useRef(false), commitRef = useRef(false), cameraRequest = useRef(0);
  const latest = useRef({ lot, paused: profile.status === "paused", mode });
  latest.current = { lot, paused: profile.status === "paused", mode };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const scanLock = useRef(false);
  const stopCamera = useCallback(() => { cameraRequest.current++; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setCameraActive(false); }, []);
  const reset = useCallback(() => { if (timer.current) clearTimeout(timer.current); busyRef.current = false; commitRef.current = false; scanLock.current = false; setBusy(false); setResult(null); setCompleted(false); setCurrentRecord(null); setNotice(""); }, []);
  useEffect(() => { setClock(new Date()); const interval = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(interval); }, []);
  useEffect(() => () => { cameraRequest.current++; stream.current?.getTracks().forEach(t => t.stop()); if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => () => { void audio.current?.close(); }, []);
  useEffect(() => {
    if (muted || !result || !audio.current) return;
    try { const context = audio.current; const tone = context.createOscillator(); const gain = context.createGain(); tone.frequency.value = result.status === "valid" ? 880 : 280; gain.gain.setValueAtTime(.07, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .18); tone.connect(gain); gain.connect(context.destination); tone.start(); tone.stop(context.currentTime + .2); } catch { /* Audio is optional; ticket handling still works. */ }
  }, [result, muted]);
  function toggleAudio() { if (muted) { try { audio.current ??= new AudioContext(); void audio.current.resume(); } catch { setNotice("Trình duyệt chưa hỗ trợ âm báo."); return; } } setMuted(v => !v); }
  const recordResult = useCallback((value: GateResult) => {
    const id = Date.now(); setCurrentRecord(id); setResult(value); setCompleted(false); setBusy(false); busyRef.current = false;
    setRecords(rows => [{ id, time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), result: value, completed: false }, ...rows].slice(0, 20));
  }, []);
  const scan = useCallback((raw: string, scanMode?: GateMode) => {
    if (busyRef.current) return; busyRef.current = true; scanLock.current = true; commitRef.current = false;
    setCompleted(false); setBusy(true); setResult(null); setNotice("");
    timer.current = setTimeout(() => { const current = latest.current; recordResult(inspectGateTicket(current.lot, raw, scanMode ?? current.mode, current.paused)); }, 650);
  }, [recordResult]);
  async function startCamera() {
    if (cameraActive) { stopCamera(); return; }
    setCameraMessage(""); const request = ++cameraRequest.current;
    try {
      if (!getDetector()) throw new Error("Trình duyệt chưa hỗ trợ đọc QR trực tiếp. Chọn nhập mã vé thủ công hoặc thử Chrome/Edge mới.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera cần localhost hoặc HTTPS.");
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      if (request !== cameraRequest.current) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media; if (video.current) { video.current.srcObject = media; await video.current.play(); } setCameraActive(true);
    } catch (error) { stopCamera(); setCameraMessage(error instanceof Error && error.name === "NotAllowedError" ? "Chưa được cấp quyền camera. Bạn có thể nhập mã vé thủ công." : (error as Error).message); }
  }
  useEffect(() => {
    if (!cameraActive) return;
    const Constructor = getDetector(); if (!Constructor) return;
    const detector = new Constructor({ formats: ["qr_code"] }); let detecting = false, cancelled = false;
    const interval = setInterval(async () => { if (detecting || scanLock.current || !video.current || video.current.readyState < 2) return; detecting = true; try { const codes = await detector.detect(video.current); if (!cancelled && codes[0]) scan(codes[0].rawValue); } catch { if (!cancelled) setCameraMessage("Không đọc được khung hình. Thử nhập mã thủ công."); } finally { detecting = false; } }, 500);
    return () => { cancelled = true; clearInterval(interval); };
  }, [cameraActive, scan]);
  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { setCameraMessage("Chọn ảnh QR có dung lượng tối đa 5 MB."); return; }
    setCameraMessage("");
    let bitmap: ImageBitmap | null = null;
    try { const Constructor = getDetector(); if (!Constructor) throw new Error("Trình duyệt chưa hỗ trợ đọc ảnh QR. Vui lòng nhập mã trên vé."); bitmap = await createImageBitmap(file); const codes = await new Constructor({ formats: ["qr_code"] }).detect(bitmap); if (!codes[0]) throw new Error("Không tìm thấy QR trong ảnh. Hãy chọn ảnh rõ nét hơn."); scan(codes[0].rawValue); } catch (error) { setCameraMessage((error as Error).message); } finally { bitmap?.close(); }
  }
  function scenario(index: number) {
    reset(); stopCamera();
    if (index === 6) return;
    if (index === 5) { busyRef.current = true; setBusy(true); timer.current = setTimeout(() => { busyRef.current = false; setBusy(false); }, 2500); return; }
    const nextMode: GateMode = index === 1 || index === 2 ? "out" : "in"; setMode(nextMode);
    const candidate = lot.sessions.find(s => index === 1 || index === 2 || index === 4 ? s.status === "parked" : index === 3 ? s.status === "cancelled" : s.status === "holding" || s.status === "confirmed");
    if (!candidate) { setNotice("Bãi này chưa có phiên phù hợp để thử tình huống. Chọn bãi Hải Châu 1 hoặc nhập mã vé."); return; }
    const value = inspectGateTicket(lot, candidate.id, nextMode, profile.status === "paused");
    // The surcharge case is an explicit demonstration, never a real payment.
    if (index === 2 && value.status === "valid") { value.total += 25000; value.due = Math.max(0, value.total - candidate.deposit); value.message = "Mô phỏng trễ giờ: phụ thu 25.000đ. Xác nhận thanh toán mẫu trước khi xe ra."; }
    recordResult(value); setTicket(candidate.id); scanLock.current = true;
  }
  useEffect(() => { const handle = (event: KeyboardEvent) => { if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLElement && (event.target.matches("input,textarea,select") || event.target.isContentEditable) || document.querySelector("dialog[open]")) return; const key = Number(event.key); if (key >= 1 && key <= 7) { event.preventDefault(); scenario(key - 1); } }; window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle); });
  function confirmGate() {
    if (!result?.session || result.status !== "valid" || completed || commitRef.current) return;
    commitRef.current = true;
    const current = latest.current;
    const fresh = inspectGateTicket(current.lot, result.session.id, result.mode, current.paused);
    if (current.lot.id !== result.lotId || fresh.status !== "valid") { setResult(fresh); commitRef.current = false; return; }
    try {
      let updated = transitionSession(current.lot, result.session.id, result.mode === "in" ? "checkin" : "checkout");
      if (result.mode === "out" && result.total !== Math.max(result.session.amount, 80000)) updated = { ...updated, collected: updated.collected + result.total - Math.max(result.session.amount, 80000), sessions: updated.sessions.map(s => s.id === result.session!.id ? { ...s, amount: result.total, overtimeFee: Math.max(0, result.total - Math.max(result.session!.amount, 80000)) } : s) };
      setOverviews(value => ({ ...value, [result.lotId]: updated })); setCompleted(true);
      setRecords(rows => rows.map(row => row.id === currentRecord ? { ...row, completed: true } : row));
    } catch (error) { setNotice((error as Error).message); commitRef.current = false; }
  }
  function changeMode(next: GateMode) { reset(); setMode(next); }
  const success = completed && result?.status === "valid";
  const recent = records.filter(r => r.result.lotId === selectedId);
  return <div className={clsx(tokens.partner, shell.shell, styles.kiosk, collapsed && shell.collapsed, full && styles.full)}>
    {!full && <PartnerSidebar active="kiosk" open={navOpen} collapsed={collapsed} onClose={() => setNavOpen(false)} onCollapse={() => setCollapsed(v => !v)} onAuxiliary={setDialog} />}
    <div className={styles.workspace}>
      <header className={styles.header}><button type="button" className={styles.menu} onClick={() => setNavOpen(true)} aria-label="Mở menu"><Menu size={21}/></button><label className={styles.lotSelector}><span>Bãi đỗ xe</span><select aria-label="Bãi đỗ xe" value={selectedId} onChange={e => { reset(); stopCamera(); selectLot(e.target.value); }}>{catalog.filter(l=>["active","paused"].includes(l.status)).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><i/></label><span className={styles.kioskLabel}>CỔNG<br/>KIOSK BARIE</span><div className={styles.gateSwitch}><button type="button" aria-pressed={mode==="in"} onClick={()=>changeMode("in")}><LogIn size={19}/><span>Check-in<small>(Cổng vào)</small></span></button><button type="button" aria-pressed={mode==="out"} onClick={()=>changeMode("out")}><LogOut size={19}/><span>Check-out<small>(Cổng ra)</small></span></button></div><div className={styles.clock}><b>{clock?.toLocaleTimeString("vi-VN") ?? "--:--:--"}</b><small>{clock?.toLocaleDateString("vi-VN") ?? "—"}</small></div><button type="button" className={styles.iconButton} aria-label={muted?"Bật âm báo":"Tắt âm báo"} aria-pressed={muted} onClick={toggleAudio}>{muted?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><button type="button" className={styles.iconButton} aria-label={full?"Thoát chế độ tập trung":"Chế độ tập trung"} onClick={()=>setFull(v=>!v)}><Expand size={18}/></button><button type="button" className={styles.guard} onClick={()=>setDialog("Thông tin ca trực")}><span>MT</span><span>Bảo vệ ca trực<b>Minh Trần</b></span></button><Link href="/sessions" className={styles.exit}><LogOut size={16}/><span>Thoát</span></Link></header>
      <main className={styles.content}>
        <div className={styles.leftColumn}><section className={styles.cameraCard}><div className={styles.cameraHeading}><h1><i/>Camera<br/>Quét Mã QR</h1><span className={styles.liveLabel}>{cameraActive?"LIVE FEED":"DEMO FEED"}</span><div className={styles.device}><Camera size={15}/>Webcam Cổng Barie #01<ChevronDown size={13}/></div><button type="button" className={styles.iconButton} aria-label="Khởi động lại camera" onClick={()=>{stopCamera();setCameraMessage("Camera đã tắt. Bấm Bật camera để kết nối lại.");}}><RefreshCw size={16}/></button></div>
          <div className={clsx(styles.feed, success && styles.feedSuccess)}><video ref={video} playsInline muted className={clsx(styles.video,!cameraActive&&styles.hidden)}/>{!cameraActive && <div className={styles.demoScene} aria-label="Khung camera mô phỏng"><div className={styles.lane}/><Car size={128} strokeWidth={1.1}/><div className={clsx(styles.barrier,success&&styles.barrierOpen)}><span/></div><div className={styles.demoFeedLabel}><Camera size={12}/> CAMERA MÔ PHỎNG</div></div>}<div className={styles.telemetry}><span><i/>{cameraActive?"CAMERA ONLINE":"KIOSK PREVIEW"}</span><span>{cameraActive?"QUÉT QR TỰ ĐỘNG":"MÔ PHỎNG · KHÔNG KẾT NỐI BARIE"}</span></div><div className={styles.scanFrame}><span/><span/><span/><span/>{busy?<LoaderCircle size={56} className={styles.spin}/>:success?<CheckCircle2 size={64}/>:<QrCode size={62}/>}<i className={styles.scanLine}/></div><div className={styles.cameraHint}><ScanLine size={21}/><span>{success?"Đã xác nhận · Barie mở (mô phỏng)":"Đưa mã QR trên vé EZ-Space vào khung camera"}</span></div></div>
          <div className={styles.inputTabs}>{(["camera","manual","upload"] as const).map((id,i)=><button type="button" key={id} aria-pressed={inputMode===id} onClick={()=>{setInputMode(id);if(id!=="camera")stopCamera();}}>{i===0?<Camera size={15}/>:i===1?<Keyboard size={15}/>:<Upload size={15}/>}<span>{i===0?"Camera trực tiếp":i===1?"Nhập mã vé thủ công":"Tải ảnh QR"}</span></button>)}</div>
          {inputMode==="camera" && <div className={styles.cameraControls}><span>{cameraActive?"Camera đang đọc mã QR":"Camera chưa được bật"}</span><PartnerButton size="small" variant={cameraActive?"secondary":"primary"} onClick={startCamera}>{cameraActive?"Tắt camera":"Bật camera"}</PartnerButton></div>}
          {inputMode==="manual" && <form className={styles.manualForm} onSubmit={e=>{e.preventDefault();scan(ticket);}}><label>Mã đặt chỗ trên vé<input value={ticket} onChange={e=>setTicket(e.target.value)} placeholder="Ví dụ: EZ-8921" required/></label><PartnerButton type="submit" size="small" disabled={busy}><ScanLine size={15}/>Kiểm tra vé</PartnerButton><small>Vé mẫu: {lot.sessions.find(s=>mode==="in"?["holding","confirmed"].includes(s.status):s.status==="parked")?.id ?? "Chưa có vé phù hợp"}</small></form>}
          {inputMode==="upload" && <label className={styles.upload}><Upload size={20}/><span>Chọn ảnh QR · PNG, JPG, tối đa 5 MB</span><input type="file" accept="image/*" onChange={e=>{void upload(e.target.files?.[0]);e.target.value="";}}/></label>}
          {cameraMessage && <p className={styles.cameraError} role="status">{cameraMessage}</p>}
        </section><section className={styles.simulator}><h2><Keyboard size={15}/>THỬ NGHIỆM KỊCH BẢN QUÉT NHANH <span>HOTKEYS 1–7</span></h2><div>{scenarios.map((label,i)=><button type="button" key={label} onClick={()=>scenario(i)}><i data-tone={i===3?"danger":i===2||i===4?"warning":"success"}/>{i+1}. {label}</button>)}<button type="button" className={styles.incidentButton} onClick={()=>setDialog("Báo sự cố")}><AlertTriangle size={13}/>Báo sự cố</button></div></section></div>
        <div className={styles.rightColumn}><section className={clsx(styles.resultCard,result?.status==="rejected"&&styles.rejected,success&&styles.success)} aria-live="polite">
          {busy?<div className={styles.ready}><span className={styles.resultIcon}><LoaderCircle size={42} className={styles.spin}/></span><h2>ĐANG KIỂM TRA VÉ</h2><p>Đang đối chiếu đặt chỗ và trạng thái ô đỗ…</p></div>:!result?<div className={styles.ready}><span className={styles.resultIcon}><QrCode size={45}/></span><h2>SẴN SÀNG QUÉT MÃ</h2><p>Đặt vé điện tử EZ-Space hoặc thẻ QR trước camera để bắt đầu nhận diện.</p><span className={styles.modeBadge}>◉ Chế độ đang mở: {mode==="in"?"Cổng Vào (Check-in)":"Cổng Ra (Check-out)"}</span></div>:<div className={styles.resultBody}><span className={styles.resultIcon}>{success?<CheckCircle2 size={42}/>:result.status==="rejected"?<CircleIcon/>:<ShieldCheck size={42}/>}</span><h2>{success?"ĐÃ XÁC NHẬN — BARIE MỞ":result.title}</h2><p>{success?"Thao tác mô phỏng hoàn tất. Trạng thái phiên đỗ đã được cập nhật.":result.message}</p>{result.session && <><div className={styles.ticketIdentity}><Car size={24}/><div><b>{result.session.plate}</b><small>{result.session.customer}</small></div><PartnerBadge tone="info">Ô {result.session.slotId}</PartnerBadge></div><dl><div><dt>Mã đặt chỗ</dt><dd>{result.session.id}</dd></div><div><dt>Bãi đỗ</dt><dd>{lot.name}</dd></div><div><dt>Tiền cọc đã thanh toán</dt><dd>{money(result.session.deposit)}</dd></div>{result.mode==="out" && <><div><dt>Tổng phí mô phỏng</dt><dd>{money(result.total)}</dd></div><div className={styles.due}><dt>Cần thu thêm</dt><dd>{money(result.due)}</dd></div></>}</dl></>}{result.status==="valid"&&!completed && <PartnerButton className={styles.confirmButton} onClick={confirmGate}><Check size={17}/>{result.mode==="in"?"Xác nhận check-in & mở barie":result.due>0?"Xác nhận đã thu tiền mẫu & cho xe ra":"Xác nhận check-out & mở barie"}</PartnerButton>}<PartnerButton variant="secondary" className={styles.confirmButton} onClick={reset}><RefreshCw size={15}/>Quét vé tiếp theo</PartnerButton></div>}
        </section><section className={styles.history}><div className={styles.historyHeading}><h2><History size={17}/>Lượt Quét Gần Đây</h2><small>Bấm vào hàng để xem lại</small></div><div className={styles.tableWrap}><table><thead><tr><th>Giờ</th><th>Mã đơn</th><th>Biển số</th><th>Hành động</th><th>Kết quả</th><th>Thu thêm</th></tr></thead><tbody>{recent.slice(0,5).map(row=><tr key={row.id}><td>{row.time}</td><td><button type="button" onClick={()=>{reset();stopCamera();setResult(row.result);setCompleted(row.completed);setCurrentRecord(row.id);setMode(row.result.mode);}}>{row.result.session?.id ?? "—"}</button></td><td>{row.result.session?.plate ?? "—"}</td><td><span className={styles.actionBadge}>{row.result.mode==="in"?"Vào":"Ra"}</span></td><td><span className={clsx(styles.historyBadge,row.result.status==="rejected"&&styles.badgeDanger)}>{row.result.status==="rejected"?"Từ chối":row.completed?"Đã xử lý":"Hợp lệ"}</span></td><td>{money(row.result.due)}</td></tr>)}</tbody></table>{!recent.length&&<div className={styles.emptyHistory}><History size={23}/><span>Chưa có lượt quét trong ca trực này</span></div>}</div></section></div>
      </main><footer className={styles.footer}><span><i/>Máy chủ Cloud: <b>Dữ liệu mẫu</b></span><span><i/>Camera Barie #01: <b>{cameraActive?"Đã bật":"Chưa bật"}</b></span><span>Barie: <b>{success?"MỞ (MẪU)":"ĐANG ĐÓNG"}</b></span><span>Check-in: <b>{recent.filter(r=>r.completed&&r.result.mode==="in").length}</b></span><span>Check-out: <b>{recent.filter(r=>r.completed&&r.result.mode==="out").length}</b></span><span>Thu thêm mẫu: <b>{money(recent.filter(r=>r.completed&&r.result.mode==="out").reduce((sum,r)=>sum+r.result.due,0))}</b></span></footer>
    </div>
    <Dialog title={dialog ?? ""} open={dialog!==null} onClose={()=>setDialog(null)}>{dialog==="Báo sự cố"?<form className={styles.incidentForm} onSubmit={e=>{e.preventDefault();setNotice("Đã ghi nhận sự cố trong bản xem thử: "+incident.trim());setIncident("");setDialog(null);}}><label>Mô tả sự cố<textarea required minLength={5} maxLength={500} value={incident} onChange={e=>setIncident(e.target.value)} placeholder="Ví dụ: Camera không nhận mã QR…"/></label><p>Thông tin chỉ được ghi nhận trong phiên xem thử.</p><PartnerButton type="submit" disabled={incident.trim().length<5}>Ghi nhận sự cố mẫu</PartnerButton></form>:<><p>Ca trực của Minh Trần · {lot.name}. Gate Kiosk đang chạy ở chế độ trình diễn, chưa kết nối thiết bị cổng hoặc thanh toán thật.</p><PartnerButton variant="secondary" onClick={()=>setDialog(null)}>Đã hiểu</PartnerButton></>}</Dialog>
    {notice&&<div className={shell.toast} role="status"><ShieldCheck size={18}/><span>{notice}</span><button type="button" aria-label="Đóng thông báo" onClick={()=>setNotice("")}><X size={16}/></button></div>}
  </div>;
}

function CircleIcon(){return <AlertTriangle size={42}/>;}
