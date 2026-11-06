"use client";

import { useState } from "react";
import { ArrowRight, Ban, Banknote, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, Download, FilterX, Gauge, LayoutGrid, LockKeyhole, Search, ShieldCheck, Table2, TrendingUp } from "lucide-react";
import { auditActions, auditCsv, auditEntries, filterAudit, type AuditAction, type AuditEntry } from "@/lib/audit-log";
import { validDateRange } from "@/lib/revenue-report";
import { ReportHeader, ReportSidebar } from "./PartnerReportChrome";
import Dialog from "./PartnerDialog";
import chrome from "./revenue.module.css";
import styles from "./audit.module.css";

const actionIcons = { UPDATE_PRICING:Banknote, FORCE_CANCEL:Ban, LOCK_SLOT:LockKeyhole, UPDATE_LAYOUT:LayoutGrid, UPDATE_CAPACITY:Gauge, UPDATE_LOT_INFO:Building2 };
const dateLabel=(date:string)=>`${date.slice(8)}/${date.slice(5,7)}/${date.slice(0,4)}`;
const groupWidths:Record<string,number[]>={"2026-10-29":[100.5,157.17,185.27,168.44,193.95,320,117.48],"2026-10-28":[100.83,157.17,194.78,147.38,112.09,320,117.48],"2026-10-27":[100.02,157.17,195.47,143.39,134.44,320,117.48]};

function ActionBadge({action}:{action:AuditAction}) {
  const Icon=actionIcons[action];
  return <span className={styles.actionBadge} data-action={action}><Icon size={14}/>{action}</span>;
}

function ChangeSummary({entry}:{entry:AuditEntry}) {
  if(entry.action==="FORCE_CANCEL")return <span className={styles.danger}>{entry.after}</span>;
  if(entry.action==="UPDATE_LAYOUT")return <span className={styles.layoutChange}><b>+4 ô mới</b><span>· Đổi 2 ô EV sạc nhanh</span></span>;
  return <span className={styles.change} data-action={entry.action}><span>{entry.before}</span><ArrowRight size={13}/><b>{entry.after}</b></span>;
}

export default function PartnerAudit() {
  const [view,setView]=useState<"table"|"timeline">("table");
  const [query,setQuery]=useState(""),[action,setAction]=useState<AuditAction|"all">("all"),[manager,setManager]=useState("all");
  const [from,setFrom]=useState(""),[to,setTo]=useState("");
  const [dialog,setDialog]=useState<string|null>(null),[selected,setSelected]=useState<AuditEntry|null>(null),[error,setError]=useState("");
  const filtered=filterAudit(auditEntries,{query,action,manager,from,to});
  const dates=[...new Set(filtered.map(entry=>entry.date))];
  const dateText=from?from===to?(from==="2026-10-29"?"Hôm nay, ":from==="2026-10-28"?"Hôm qua, ":"")+dateLabel(from):`${dateLabel(from)} – ${dateLabel(to)}`:"Hôm nay, 29/10/2026";

  function reset(){setQuery("");setAction("all");setManager("all");setFrom("");setTo("");}
  function close(){setDialog(null);setSelected(null);setError("");}
  function exportCsv(){
    const url=URL.createObjectURL(new Blob([auditCsv(filtered)],{type:"text/csv;charset=utf-8"}));
    const link=document.createElement("a");link.href=url;link.download=`EZ-Space-nhat-ky-HC1-DN${from?`-${from}-${to}`:"-2026-10"}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  return <div className={`${chrome.page} ${styles.page}`}>
    <ReportSidebar active="audit"/>
    <div className={chrome.workspace}>
      <ReportHeader onAuxiliary={setDialog} onSearch={value=>{setQuery(value);document.getElementById("audit-filters")?.scrollIntoView({behavior:"smooth"});}}/>
      <main className={styles.content}>
        <section className={styles.intro} aria-label="Lịch sử thao tác và đối soát">
          <div className={styles.heading}>
            <div className={styles.titleBlock}><div className={styles.titleRow}><h1>Lịch sử thao tác</h1><span className={styles.lotBadge}><Building2 size={14}/><b>Bãi Hải Châu 1</b><small>HC1-DN</small></span><span className={styles.liveBadge}><i/>Đối soát trực tiếp</span></div><p>Nhật ký ghi lại mọi thay đổi cấu hình bãi đỗ, phân quyền, biến động giá và điều phối ô đỗ thời gian thực nhằm phục vụ hậu kiểm và giải trình đối soát.</p></div>
            <div className={styles.actions}><div className={styles.viewSwitch} role="tablist" aria-label="Cách xem nhật ký"><button role="tab" id="audit-table-tab" aria-selected={view==="table"} aria-controls="audit-records" onClick={()=>setView("table")}><Table2 size={14}/>Bảng</button><button role="tab" id="audit-timeline-tab" aria-selected={view==="timeline"} aria-controls="audit-records" onClick={()=>setView("timeline")}><TrendingUp size={17}/>Dòng thời gian</button></div><button className={styles.exportButton} onClick={exportCsv}><Download size={14}/>Xuất CSV</button></div>
          </div>
          <div className={styles.integrityBanner}><div className={styles.integrityBody}><span className={styles.shield}><ShieldCheck size={19}/></span><div><b>Nhật ký bất biến (Tamper-proof Log)</b><p>Nhật ký chỉ để xem, không thể chỉnh sửa hay xóa. Mọi hành vi quản trị đều được mã hóa và lưu vết tự động vào hệ thống đối soát trung tâm EZ-Audit.</p></div></div><span className={styles.verified}><LockKeyhole size={12}/>SHA-256 Verified</span></div>
        </section>

        <section id="audit-filters" className={styles.filterCard} aria-label="Bộ lọc lịch sử thao tác">
          <div className={styles.filterRow}><label className={styles.search}><Search size={18}/><input aria-label="Tìm nhật ký theo lý do hoặc mã đơn" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tìm theo lý do, mã đơn (e.g. EZ-8902)"/></label><label className={styles.actionSelect}><select aria-label="Loại thao tác" value={action} onChange={e=>setAction(e.target.value as typeof action)}>{auditActions.map(item=><option value={item.id} key={item.id}>{item.label} ({item.count})</option>)}</select><ChevronDown size={14}/></label><label className={styles.managerSelect}><select aria-label="Người thực hiện" value={manager} onChange={e=>setManager(e.target.value)}><option value="all">Tất cả quản lý</option><option>Minh Trần</option><option>Lê Hoàng</option></select><ChevronDown size={14}/></label><button className={styles.dateButton} onClick={()=>setDialog("Khoảng thời gian tùy chọn")} aria-label="Chọn khoảng ngày nhật ký"><span>{dateText}</span><CalendarDays size={17}/></button><button className={styles.reset} onClick={reset}><FilterX size={16}/>Xóa</button></div>
          <div className={styles.quickFilters}><span>Bộ lọc nhanh:</span>{auditActions.slice(0,6).map(item=><button key={item.id} aria-pressed={action===item.id} onClick={()=>setAction(item.id)}>{item.short}: {item.count}</button>)}</div>
        </section>

        <div id="audit-records" role="tabpanel" aria-labelledby={view==="table"?"audit-table-tab":"audit-timeline-tab"} className={styles.groups}>
          {dates.map((date,index)=>{
            const entries=filtered.filter(entry=>entry.date===date),widths=groupWidths[date],tableWidth=widths.reduce((sum,width)=>sum+width,0);
            const heading=date==="2026-10-29"?"Hôm nay — 29/10/2026":date==="2026-10-28"?"Hôm qua — 28/10/2026":dateLabel(date);
            return <section className={styles.dayGroup} key={date} data-date={date} aria-label={`Nhật ký ${dateLabel(date)}`}>
              <div className={styles.groupHeading}><div><i style={{background:index===0?"#004cc4":date==="2026-10-28"?"#7b7c89":"#c9c9d8"}}/><h2>{heading}</h2><span>{entries.length} thao tác</span></div><small>Lần cập nhật {date==="2026-10-29"?"cuối":""}: {entries[0].time}</small></div>
              {view==="table"?<div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`Bảng nhật ký ${dateLabel(date)}, cuộn ngang để xem toàn bộ`}><table style={{width:tableWidth}}><colgroup>{widths.map((width,i)=><col key={i} style={{width}}/>)}</colgroup><thead><tr>{["THỜI GIAN","NGƯỜI THỰC HIỆN","LOẠI THAO TÁC","ĐỐI TƯỢNG","TÓM TẮT THAY ĐỔI","LÝ DO THAY ĐỔI","THAO TÁC"].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{entries.map(entry=><tr key={entry.id} data-action={entry.action}><td><button className={styles.time} onClick={()=>setSelected(entry)} aria-label={`Xem nhật ký ${entry.id}`}><b>{entry.time}</b><small>{dateLabel(entry.date)}</small></button></td><td><div className={styles.manager}><span data-person={entry.initials}>{entry.initials}</span><div><b>{entry.manager}</b><small>{entry.role}</small></div></div></td><td><ActionBadge action={entry.action}/></td><td><div className={styles.object}><b>{entry.object}</b><span>{entry.context}</span></div></td><td><ChangeSummary entry={entry}/></td><td className={styles.reason} title={entry.reason}>“{entry.reason}”</td><td className={styles.detailCell}><button onClick={()=>setSelected(entry)} aria-label={`Chi tiết ${entry.id}`}>Chi tiết<ChevronRight size={12}/></button></td></tr>)}</tbody></table></div>:<div className={styles.timeline}>{entries.map(entry=><article key={entry.id}><span className={styles.timelineDot}/><div className={styles.timelineTime}>{entry.time}<small>{entry.manager}</small></div><div className={styles.timelineBody}><ActionBadge action={entry.action}/><h3>{entry.object}</h3><p>{entry.context}</p><ChangeSummary entry={entry}/><blockquote>“{entry.reason}”</blockquote><button onClick={()=>setSelected(entry)}>Chi tiết<ChevronRight size={13}/></button></div></article>)}</div>}
            </section>;
          })}
          {!dates.length&&<div className={styles.empty}><Search size={26}/><h2>Không tìm thấy nhật ký phù hợp</h2><p>Thử thay đổi từ khóa hoặc bộ lọc.</p><button onClick={reset}>Xóa bộ lọc</button></div>}
        </div>
      </main>
    </div>
    <Dialog open={!!(dialog||selected)} title={selected?"Chi tiết nhật ký":dialog??"Thông tin"} onClose={close} side={!!selected}>
      {selected?<div className={styles.details}><ActionBadge action={selected.action}/><h3>{selected.object}</h3><p>{selected.context}</p><dl>{[["Mã nhật ký",selected.id],["Thời gian",`${dateLabel(selected.date)} ${selected.time}`],["Người thực hiện",`${selected.manager} · ${selected.role}`],["Bãi đỗ","Bãi Hải Châu 1 · HC1-DN"]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className={styles.beforeAfter}><div><small>TRƯỚC THAY ĐỔI</small><p>{selected.before}</p></div><div><small>SAU THAY ĐỔI</small><p>{selected.after}</p></div></div><div className={styles.reasonDetail}><b>Lý do thay đổi</b><p>{selected.reason}</p></div><span className={styles.readOnly}><LockKeyhole size={14}/>Nhật ký chỉ đọc</span></div>:dialog==="Khoảng thời gian tùy chọn"?<form className={styles.dateForm} onSubmit={e=>{e.preventDefault();const values=new FormData(e.currentTarget),start=String(values.get("from")),end=String(values.get("to"));if(!validDateRange(start,end)){setError("Chọn khoảng ngày hợp lệ, tối đa 367 ngày.");return;}setFrom(start);setTo(end);close();}}><div className={styles.datePresets}>{[["Hôm nay","2026-10-29"],["Hôm qua","2026-10-28"]].map(([label,date])=><button key={date} type="button" onClick={()=>{setFrom(date);setTo(date);close();}}>{label}</button>)}<button type="button" onClick={()=>{setFrom("");setTo("");close();}}>Tất cả ngày</button></div><label>Từ ngày<input type="date" name="from" defaultValue={from||"2026-10-27"} required/></label><label>Đến ngày<input type="date" name="to" defaultValue={to||"2026-10-29"} required/></label>{error&&<p role="alert">{error}</p>}<button className={styles.applyButton} type="submit"><CheckCircle2 size={16}/>Áp dụng</button></form>:<p className={styles.auxiliary}>{dialog==="Điểm quản lý"?"Bãi Hải Châu 1 · HC1-DN":dialog==="Thông báo"?"Không có thông báo mới.":"Quản trị viên · haichau1@ezspace.vn"}</p>}
    </Dialog>
  </div>;
}
