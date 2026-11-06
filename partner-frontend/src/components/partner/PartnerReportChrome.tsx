"use client";

import Link from "next/link";
import { Banknote, BarChart3, Bell, CalendarDays, ChevronDown, History, LayoutGrid, Map, MapPin, ParkingSquare, Search, SlidersHorizontal, Tablet, UserRound } from "lucide-react";
import styles from "./revenue.module.css";

const links = [
  {href:"/dashboard",label:"Tổng quan",icon:LayoutGrid},
  {href:"/lots",label:"Bãi đỗ xe",icon:ParkingSquare},
  {href:"/layout",label:"Sơ đồ ô đỗ",icon:Map},
  {href:"/pricing",label:"Bảng giá",icon:Banknote},
  {href:"/sessions",label:"Đặt chỗ & Phiên đỗ",icon:CalendarDays},
  {href:"/kiosk",label:"Gate Kiosk",icon:Tablet},
  {href:"/revenue",label:"Báo cáo doanh thu",icon:BarChart3},
  {href:"/audit",label:"Lịch sử thao tác",icon:History},
];

export function ReportSidebar({active}:{active:"revenue"|"audit"}) {
  return <aside className={styles.sidebar} aria-label="Điều hướng đối tác">
    <Link href="/dashboard" className={styles.brand}><span>P</span><div><b>EZ-Space</b><small>PARTNER HUB</small></div></Link>
    <p className={styles.eyebrow}>QUẢN LÝ BÃI ĐỖ</p>
    <nav>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} aria-current={href===`/${active}`?"page":undefined}><Icon size={18}/>{label}</Link>)}</nav>
    <div className={styles.kioskStatus}><span><i/>Kiosk Trực Tuyến</span><b>Hoạt động</b></div>
  </aside>;
}

export function ReportHeader({onAuxiliary,onSearch}:{onAuxiliary:(title:string)=>void;onSearch:(value:string)=>void}) {
  return <header className={styles.header}>
    <div className={styles.headerLeft}>
      <button className={styles.lotPicker} onClick={()=>onAuxiliary("Điểm quản lý")}><MapPin size={20}/><span><small>Điểm quản lý</small><b>Bãi Hải<br/>Châu 1</b></span><ChevronDown size={14}/></button>
      <div className={styles.capacity}><i/><span>Sức chứa khả dụng: <b>142 /<br/>200 ô</b></span></div>
    </div>
    <div className={styles.headerRight}>
      <label className={styles.headerSearch}><Search size={15}/><input placeholder="Tìm biển số, vé, mã đặt..." aria-label="Tìm kiếm quản lý bãi" onKeyDown={e=>{if(e.key==="Enter")onSearch(e.currentTarget.value);}}/></label>
      <button className={styles.notification} aria-label="Thông báo" onClick={()=>onAuxiliary("Thông báo")}><Bell size={18}/><i/></button>
      <button className={styles.iconButton} aria-label="Tùy chỉnh báo cáo" onClick={()=>onAuxiliary("Khoảng thời gian tùy chọn")}><SlidersHorizontal size={18}/></button>
      <span className={styles.divider}/>
      <Link href="/settings" className={styles.account} aria-label="Cài đặt tài khoản và bảo mật"><span><UserRound size={15}/></span><div><b>Quản trị viên</b><small>haichau1@ezspace.vn</small></div></Link>
    </div>
  </header>;
}
