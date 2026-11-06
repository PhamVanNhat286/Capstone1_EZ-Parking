"use client";

import { useState } from "react";
import { ReportHeader, ReportSidebar } from "./PartnerReportChrome";
import { ArrowDown, ArrowUp, Banknote, Building2, CalendarDays, CarFront, CarTaxiFront, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Download, RotateCcw, Search, ShieldAlert, Wallet, Zap } from "lucide-react";
import Dialog from "./PartnerDialog";
import { reportRows, reportLabels, chartDays, chartSegments, type ReportCategory, type ReportRow } from "@/lib/revenue-design-data";
import { validDateRange } from "@/lib/revenue-report";
import styles from "./revenue.module.css";

const number=(value:number)=>Math.round(value).toLocaleString("vi-VN");
const money=(value:number)=>`${number(value)}đ`;
const dateLabel=(date:string)=>`${date.slice(8)}/${date.slice(5,7)}/${date.slice(0,4)}`;

export default function PartnerRevenue() {
  const [preset,setPreset]=useState("month");
  const [from,setFrom]=useState("2026-10-01"),[to,setTo]=useState("2026-10-29");
  const [vehicle,setVehicle]=useState("all"),[group,setGroup]=useState("day");
  const [chart,setChart]=useState("bar"),[activeDay,setActiveDay]=useState(11);
  const [tab,setTab]=useState<ReportCategory|"all">("all"),[query,setQuery]=useState(""),[page,setPage]=useState(1);
  const [exportOpen,setExportOpen]=useState(false),[dialog,setDialog]=useState<string|null>(null),[selected,setSelected]=useState<ReportRow|null>(null),[error,setError]=useState("");
  const rows=reportRows.filter(row=>row.date>=from&&row.date<=to&&(vehicle==="all"||row.seats===Number(vehicle)));
  const total=rows.reduce((sum,row)=>sum+row.amount,0);
  const categoryTotal=(category:ReportCategory)=>rows.filter(row=>row.category===category).reduce((sum,row)=>sum+row.amount,0);
  const reference=from==="2026-10-01"&&to==="2026-10-29"&&vehicle==="all";
  const normalized=(value:string)=>value.toLocaleLowerCase("vi").replace(/[^\p{L}\p{N}]/gu,"");
  const tableRows=rows.filter(row=>(tab==="all"||row.category===tab)&&normalized(`${row.booking} ${row.plate}`).includes(normalized(query)));
  const count=tableRows.length,maxPage=Math.max(1,Math.ceil(count/6)),currentPage=Math.min(page,maxPage);
  const visibleRows=tableRows.slice((currentPage-1)*6,currentPage*6);
  const tableTotal=tableRows.reduce((sum,row)=>sum+row.amount,0);
  const days=Math.max(0,Math.round((Date.parse(to)-Date.parse(from))/86400000)+1);
  const selectedDay=chartDays[activeDay];
  const selectedRows=rows.filter(row=>group==="hour"?Math.floor(Number(row.time.slice(0,2))/2)===activeDay:row.date===`2026-10-${selectedDay}`);
  const referenceDay=reference&&group==="day"&&activeDay===11;
  const dayTotal=referenceDay?2850000:selectedRows.reduce((sum,row)=>sum+row.amount,0);
  const selectedSum=(category:ReportCategory)=>selectedRows.filter(row=>row.category===category).reduce((sum,row)=>sum+row.amount,0);
  const series=group==="day"?chartDays:Array.from({length:12},(_,i)=>`${String(i*2).padStart(2,"0")}h`);
  const scale=reference?1:total/48250000;

  function reset(){setPreset("month");setFrom("2026-10-01");setTo("2026-10-29");setVehicle("all");setGroup("day");setTab("all");setQuery("");setPage(1);setActiveDay(11);}
  function chooseRange(id:string){
    if(id==="custom"){setDialog("Khoảng thời gian tùy chọn");setError("");return;}
    setPreset(id);setTo("2026-10-29");setFrom(id==="today"?"2026-10-29":id==="7days"?"2026-10-23":id==="30days"?"2026-09-30":"2026-10-01");setPage(1);
  }
  function exportCsv(){
    const csv="\uFEFF"+[["Thời gian","Mã đơn","Biển số","Loại xe","Khoản thu","Cổng / Nguồn","Mã giao dịch","Số tiền","Trạng thái"],...tableRows.map(row=>[`${row.date} ${row.time}`,row.booking,row.plate,`${row.seats} chỗ`,reportLabels[row.category],row.source,row.id,String(row.amount),"Thành công"])].map(row=>row.map(cell=>`"${cell.replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=`EZ-Space-HC1-DN-${from}-${to}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setExportOpen(false);
  }
  function close(){setDialog(null);setSelected(null);}

  return <div className={styles.page}>
    <ReportSidebar active="revenue"/>
    <div className={styles.workspace}>
      <ReportHeader onAuxiliary={setDialog} onSearch={value=>{setQuery(value);setPage(1);document.getElementById("revenue-transactions")?.scrollIntoView({behavior:"smooth"});}}/>
      <main className={styles.content}>
        <div className={styles.heading}><div><div className={styles.titleRow}><h1>Báo cáo doanh thu</h1><span className={styles.lotBadge}><Building2 size={14}/><b>Bãi Hải Châu 1</b><small>(HC1-DN)</small></span></div><p>Phân tích dòng tiền thực nhận, tiền cọc qua cổng thanh toán và phụ thu vận hành bãi đỗ xe.</p></div><div className={styles.export}><button onClick={()=>setExportOpen(!exportOpen)} aria-expanded={exportOpen}><Download size={16}/>Xuất báo cáo<ChevronDown size={13}/></button>{exportOpen&&<div className={styles.exportMenu}><button onClick={exportCsv}>Xuất file CSV</button><button onClick={()=>{setExportOpen(false);window.print();}}>In / Lưu PDF</button></div>}</div></div>

        <section className={styles.filterCard} aria-label="Bộ lọc báo cáo">
          <div className={styles.filterControls}><div className={styles.quickRange}>{[["today","Hôm nay"],["7days","7 ngày"],["30days","30 ngày"],["month","Tháng này"],["custom","Tùy chọn"]].map(([id,label])=><button key={id} aria-pressed={preset===id} onClick={()=>chooseRange(id)}>{id==="custom"&&<CalendarDays size={14}/>} {label}</button>)}</div><label className={styles.vehicleFilter}>Loại xe:<select aria-label="Loại xe" value={vehicle} onChange={e=>{setVehicle(e.target.value);setPage(1);}}><option value="all">Tất cả xe</option><option value="4">Xe đến 4 chỗ</option><option value="7">Xe đến 7 chỗ</option></select></label><div className={styles.filterSecond}><label>Gộp theo:<select aria-label="Gộp theo" value={group} onChange={e=>{setGroup(e.target.value);setActiveDay(e.target.value==="hour"?4:11);}}><option value="day">Ngày</option><option value="hour">Giờ</option></select></label><button onClick={reset}><RotateCcw size={13}/>Xóa bộ lọc</button></div></div>
          <div className={styles.dateLabel}><i/><b>{dateLabel(from)} –<br/>{dateLabel(to)}</b><span>({days} ngày phân<br/>tích)</span></div>
        </section>

        <div className={styles.kpis}>
          {[{label:"Tổng doanh thu",value:total,icon:Wallet,tone:"blue",change:"+18.4%",foot:"vs tháng trước"},{label:"Tiền cọc VNPay",value:categoryTotal("deposit"),icon:Banknote,tone:"indigo",change:"+12.1%",foot:"vs tháng trước",badge:true},{label:"Thu phạt (No-show)",value:categoryTotal("penalty"),icon:ShieldAlert,tone:"red",change:"−4.2%",foot:"tỷ lệ vắng giảm",help:true},{label:"Phí lố giờ",value:categoryTotal("overtime"),icon:Clock3,tone:"gray",change:"+8.5%",foot:"so chu kỳ trước",help:true},{label:"Lượt đỗ hoàn tất",value:rows.length,icon:CarFront,tone:"green",change:"+24 lượt",foot:"công suất 84%",count:true}].map(({label,value,icon:Icon,tone,change,foot,badge,help,count})=><article key={label} className={styles.kpi} data-tone={tone}><div className={styles.kpiTop}><div><span>{label}{help&&<CircleHelp size={12}/>}</span>{badge&&<small>VNPAY SANDBOX</small>}</div><span className={styles.kpiIcon}><Icon size={20}/></span></div><div className={styles.kpiValue}>{number(value)}<small>{count?"lượt":"đ"}</small></div><div className={styles.kpiFoot}><span>{tone==="red"?<ArrowDown size={13}/>:<ArrowUp size={13}/>}<b>{change}</b></span><small>{foot}</small></div></article>)}
        </div>

        <section id="revenue-chart-start" className={`${styles.card} ${styles.chartCard}`} aria-label="Biểu đồ doanh thu">
          <div className={styles.chartHeading}><div><h2>Doanh thu theo thời gian</h2><p>Biểu diễn dòng tiền gộp theo ngày trong tháng 10/2026 kèm đường tham chiếu tháng trước</p></div><div className={styles.chartControls}><div className={styles.legend}>{["Tiền gửi đỗ","Phí lố giờ","Cọc bị phạt","Tháng trước"].map((label,i)=><span key={label}><i data-color={i}/>{label}</span>)}</div><div className={styles.segment}><button aria-pressed={chart==="bar"} onClick={()=>setChart("bar")}>Cột chồng</button><button aria-pressed={chart==="line"} onClick={()=>setChart("line")}>Đường</button></div></div></div>
          <div className={styles.chartSummary}><div className={styles.selectedDate}><i/><b>{group==="day"?`Ngày ${selectedDay}/10/2026${activeDay===11?" (Thứ Bảy)":""}`:`Khung giờ ${series[activeDay]}`}</b><span>{activeDay===11?"Ngày đạt đỉnh":"Đang chọn"}</span></div><div className={styles.selectedStats}><span>Tổng: <b>{money(dayTotal)}</b></span><span>Giá đỗ: {money(referenceDay?2300000:selectedSum("parking")+selectedSum("deposit"))}</span><span>Phí lố giờ: {money(referenceDay?350000:selectedSum("overtime"))}</span><span>Phạt vắng: {money(referenceDay?200000:selectedSum("penalty"))}</span><span>Sản lượng: {referenceDay?28:selectedRows.length} lượt</span></div></div>
          <svg className={styles.chartSvg} viewBox="0 0 924 320" preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu tháng 10 năm 2026">
            <defs><linearGradient id="selected-revenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#004cc4"/><stop offset="100%" stopColor="#2860e8"/></linearGradient></defs>
            {[4,3,2,1,0].map((value,i)=><g key={value}><line x1="37" y1={30+i*65} x2="906" y2={30+i*65} stroke="#e8e9ec"/><text x="30" y={34+i*65}>{value?`${value}M`:"0"}</text></g>)}
            <path d="M60 240 C110 226 140 204 190 222 S260 218 310 186 S370 140 430 204 S490 236 550 145 S610 75 670 132 S730 222 790 108 S850 30 887 171" fill="none" stroke="#cfd1d7" strokeWidth="2" strokeDasharray="4 4"/>
            {chart==="line"&&<polyline points={series.map((_,i)=>`${68.376+i*(series.length===15?60.06:73.8)},${290-chartSegments[i][0]*scale}`).join(" ")} fill="none" stroke="#0053cf" strokeWidth="3"/>}
            {series.map((day,i)=>{const x=series.length===15?(i===14?882.42:55.44+i*60.06):55.44+i*73.8;const width=i===14?22.176:25.872;const [base,extra,penalty]=chartSegments[i].map(v=>v*scale);return <g key={day} role="button" tabIndex={0} aria-label={`${group==="day"?"Ngày":"Giờ"} ${day}`} aria-pressed={activeDay===i} onClick={()=>setActiveDay(i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setActiveDay(i);}}} className={styles.chartColumn}>{activeDay===i&&<rect x={x-4.62} y="20" width={width+9.24} height="275" rx="6" fill="#edf1fb"/>}{chart==="bar"?<><rect x={x} y={290-base} width={width} height={base} rx="2" fill={activeDay===i?"url(#selected-revenue)":"#004cc4"}/><rect x={x} y={290-base-extra} width={width} height={extra} rx="1" fill="#b6c4fc"/><rect x={x} y={290-base-extra-penalty} width={width} height={penalty} rx="1.5" fill="#7b7b89"/></>:<circle cx={x+width/2} cy={290-base} r="4" fill="#0053cf"/>}{activeDay===i&&<circle cx={x+width/2} cy={290-base-extra-penalty} r="3.5" fill="#0053cf" stroke="white" strokeWidth="2"/>}<rect x={x-8} y="15" width={width+16} height="282" fill="transparent"/><text x={x+width/2} y="308" className={activeDay===i?styles.selectedAxis:undefined}>{day}</text></g>;})}
          </svg>
        </section>

        <div className={styles.analysisGrid}>
          <section className={`${styles.card} ${styles.vehicleCard}`}><div className={styles.sectionHeading}><h2><span><CarFront size={18}/></span>Doanh thu theo loại xe</h2><small>{rows.length} lượt đỗ</small></div>{[{label:"Xe đến 4 chỗ",description:"Sedan, Hatchback, EV",amount:reference?32810000:rows.filter(row=>row.seats===4).reduce((sum,row)=>sum+row.amount,0),count:rows.filter(row=>row.seats===4).length,average:117180},{label:"Xe đến 7 chỗ",description:"SUV, MPV gia đình",amount:reference?15440000:rows.filter(row=>row.seats===7).reduce((sum,row)=>sum+row.amount,0),count:rows.filter(row=>row.seats===7).length,average:116970}].map((item,i)=><div className={styles.vehicleRow} key={item.label}><div><strong>{item.label} <small>({item.description})</small></strong><b>{money(item.amount)} <small>({total?(item.amount/total*100).toFixed(1):"0.0"}%)</small></b></div><div className={styles.vehicleTrack}><i style={{width:`${total?item.amount/total*100:0}%`,background:i?"#4668ed":"#004cc4"}}/></div><div><span>Số lượng: <b>{item.count} lượt</b></span><span>TB/lượt: <b>{money(reference?item.average:item.count?item.amount/item.count:0)}</b></span></div></div>)}<div className={styles.insight}><CarTaxiFront size={21}/><p>Khu vực trụ sạc EV 4 chỗ ghi nhận tỷ lệ giữ chỗ trước qua app đạt <b>91.4%.</b></p></div></section>
          <section className={`${styles.card} ${styles.hourCard}`}><div className={styles.sectionHeading}><h2><span><Clock3 size={19}/></span>Khung giờ vàng trong ngày</h2><small><i/>Giờ cao điểm (+5k–10k/h)</small></div><div className={styles.peakLabel}><Zap size={14}/>Cao điểm nhất: 07:00 – 09:00 đạt 8.420.000đ</div><div className={styles.hourBars}>{[12,8,18,50,86,64,70,54,60,86,57,29].map((height,i)=><button key={i} title={`${String(i*2).padStart(2,"0")}:00`} onClick={()=>{setGroup("hour");setActiveDay(i);document.getElementById("revenue-chart-start")?.scrollIntoView({behavior:"smooth"});}} data-peak={i===4||i===9}><i style={{height,background:i===4||i===9?"#008337":i<3||i===11?"#dfe2e7":"#004cc4"}}/><small>{String(i*2).padStart(2,"0")}h</small></button>)}</div><div className={styles.peakFooter}><span>Sáng cao điểm: <b>07:00 – 09:00</b></span><span>Chiều cao điểm: <b>17:00 – 19:30</b></span></div></section>
        </div>

        <section id="revenue-transactions" className={`${styles.card} ${styles.transactions}`}>
          <div className={styles.tableToolbar}><div className={styles.tableTabs}>{([["all","Tất cả"],["deposit","Tiền cọc"],["overtime","Phí lố giờ"],["penalty","Cọc bị phạt"]] as const).map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setPage(1);}}>{label} ({id==="all"?rows.length:rows.filter(row=>row.category===id).length})</button>)}</div><label className={styles.search}><Search size={15}/><input placeholder="Tìm mã đơn hoặc biển số..." aria-label="Tìm mã đơn hoặc biển số" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label></div>
          <div className={styles.tableScroll}><table><colgroup>{[93.66,72.66,125.5,95.7,100.36,132.83,154.3,110.22,86.78].map((width,i)=><col key={i} style={{width:`${width/972*100}%`}}/>)}</colgroup><thead><tr>{[<>THỜI<br/>GIAN</>,<>MÃ<br/>ĐƠN</>,<>BIỂN SỐ & LOẠI<br/>XE</>,<>KHOẢN<br/>THU</>,<>CỔNG /<br/>NGUỒN</>,"MÃ GIAO DỊCH","SỐ TIỀN","TRẠNG THÁI",<>THAO<br/>TÁC</>].map((label,i)=><th key={i}>{label}</th>)}</tr></thead><tbody>{visibleRows.map(row=><tr key={row.id}><td className={styles.time}>{row.date.slice(8)}/{row.date.slice(5,7)}<br/>{row.time}</td><td><button className={styles.bookingLink} onClick={()=>setSelected(row)}>{row.booking}</button></td><td><div className={styles.vehicleCell}><b>{row.plate}</b><span>{row.seats}<br/>chỗ</span></div></td><td><span className={styles.category} data-category={row.category}>{reportLabels[row.category]}</span></td><td>{row.source}</td><td><code>{row.id}</code></td><td className={styles.amount} data-penalty={row.category==="penalty"}>{money(row.amount)}</td><td><span className={styles.success}><CheckCircle2 size={12}/><b>Thành<br/>công</b></span></td><td><button className={styles.detailLink} onClick={()=>setSelected(row)} aria-label={`Chi tiết ${row.booking}`}>Chi<br/>tiết<ChevronRight size={12}/></button></td></tr>)}</tbody></table>{!count&&<div className={styles.empty}>Không tìm thấy giao dịch phù hợp.</div>}</div>
          <div className={styles.tableTotal}><span>Tổng doanh thu danh sách lọc:</span><b>{money(tableTotal)}</b><small>Hợp đồng HC1-DN</small></div>
          <div className={styles.pagination}><span>Hiển thị {count?(currentPage-1)*6+1:0}–{Math.min(currentPage*6,count)} trong số {count} giao dịch</span><nav aria-label="Phân trang giao dịch"><button disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={12}/>Trước</button>{[1,2,3].filter(p=>p<=maxPage).map(p=><button key={p} aria-current={p===currentPage?"page":undefined} onClick={()=>setPage(p)}>{p}</button>)}{maxPage>4&&<span>…</span>}{maxPage>3&&<button aria-current={currentPage>3?"page":undefined} onClick={()=>setPage(maxPage)}>{currentPage>3?currentPage:maxPage}</button>}<button disabled={currentPage===maxPage} onClick={()=>setPage(currentPage+1)}>Sau<ChevronRight size={12}/></button></nav></div>
        </section>
      </main>
    </div>
    <Dialog open={!!(dialog||selected)} title={selected?"Chi tiết giao dịch":dialog??"Thông tin"} onClose={close} side={!!selected}>{selected?<div className={styles.details}><h3>{money(selected.amount)}</h3><span className={styles.success}><CheckCircle2 size={14}/>Thành công</span><dl>{[["Mã đơn",selected.booking],["Biển số",selected.plate],["Loại xe",`${selected.seats} chỗ`],["Khoản thu",reportLabels[selected.category]],["Thời gian",`${dateLabel(selected.date)} ${selected.time}`],["Cổng / Nguồn",selected.source],["Mã giao dịch",selected.id]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>:dialog==="Khoảng thời gian tùy chọn"?<form className={styles.dateForm} onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget),start=String(form.get("from")),end=String(form.get("to"));if(!validDateRange(start,end)){setError("Vui lòng chọn ngày hợp lệ, tối đa 367 ngày.");return;}setFrom(start);setTo(end);setPreset("custom");setPage(1);close();}}><label>Từ ngày<input name="from" type="date" defaultValue={from} required/></label><label>Đến ngày<input name="to" type="date" defaultValue={to} required/></label>{error&&<p role="alert">{error}</p>}<button type="submit">Áp dụng</button></form>:<div className={styles.details}><p>{dialog==="Điểm quản lý"?"Bãi Hải Châu 1 · HC1-DN":dialog==="Tài khoản quản trị viên"?"Quản trị viên · haichau1@ezspace.vn":dialog==="Thông báo"?"Không có thông báo mới.":"Chưa có thao tác mới trong phiên này."}</p></div>}</Dialog>
  </div>;
}
