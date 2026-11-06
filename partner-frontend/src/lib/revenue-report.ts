import type { OverviewLot, ParkingSession, VehicleKind } from "./overview-model";

export type RevenueCategory = "deposit" | "parking" | "overtime" | "penalty" | "refund";
export type RevenueTransaction = { id: string; bookingId: string; plate: string; vehicle: VehicleKind; category: RevenueCategory; date: string; time: string; amount: number; status: "success" | "held" | "refunded"; source: string; session: ParkingSession };
export type ReportFilters = { from: string; to: string; vehicle: "all" | VehicleKind };
export const categoryLabels: Record<RevenueCategory, string> = { deposit: "Tiền cọc", parking: "Tiền gửi đỗ", overtime: "Phí lố giờ", penalty: "Phạt No-show", refund: "Hoàn cọc" };
export function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
export function shiftDay(key: string, offset: number) { const date = new Date(`${key}T12:00:00`); date.setDate(date.getDate()+offset); return dateKey(date); }
export function validDateRange(from: string, to: string) { const valid=(key:string)=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&!Number.isNaN(Date.parse(key))&&dateKey(new Date(`${key}T12:00:00`))===key; return valid(from) && valid(to) && from <= to && (Date.parse(to)-Date.parse(from))/86400000 <= 366; }
export function reportRange(preset: string, today: string) { return { from: preset === "today" ? today : preset === "7days" ? shiftDay(today,-6) : preset === "30days" ? shiftDay(today,-29) : `${today.slice(0,7)}-01`, to: today }; }

// Existing demo sessions only have today/yesterday labels. Anchor those labels
// to the reporting date; never fabricate earlier history or payment-provider IDs.
export function revenueTransactions(lot: OverviewLot, today: string): RevenueTransaction[] {
  const result: RevenueTransaction[] = [];
  for (const session of lot.sessions) {
    const absolute = session.completedAt ? new Date(session.completedAt) : null;
    const date = absolute && !Number.isNaN(absolute.valueOf()) ? dateKey(absolute) : session.time.startsWith("Hôm qua") ? shiftDay(today,-1) : today;
    const time = absolute && !Number.isNaN(absolute.valueOf()) ? absolute.toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}) : session.time.match(/\d{1,2}:\d{2}/)?.[0] ?? "—";
    const add = (category: RevenueCategory, amount: number, status: RevenueTransaction["status"], source: string) => { if (amount>0) result.push({ id: `${session.id}-${category}`, bookingId: session.id, plate: session.plate, vehicle: session.vehicle, category, date, time, amount, status, source, session }); };
    if (session.status === "completed") {
      const total = Math.max(0, session.amount);
      const overtime = Math.min(total, Math.max(0, session.overtimeFee ?? 0));
      const deposit = Math.min(Math.max(0, session.deposit), total-overtime);
      add("deposit",deposit,"success","Cọc qua ứng dụng · Mẫu");
      add("parking",total-deposit-overtime,"success","Gate Kiosk · Mẫu");
      add("overtime",overtime,"success","Gate Kiosk · Mẫu");
    } else if (session.status === "cancelled") add("refund",session.deposit,"refunded","Hoàn cọc theo đơn · Mẫu");
    else add("deposit",session.deposit,"held","Cọc qua ứng dụng · Mẫu");
  }
  return result.sort((a,b)=>b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || a.id.localeCompare(b.id));
}
export function filterRevenue(rows: RevenueTransaction[], filters: ReportFilters) { return rows.filter(row=>row.date>=filters.from&&row.date<=filters.to&&(filters.vehicle==="all"||row.vehicle===filters.vehicle)); }
export function summarizeRevenue(rows: RevenueTransaction[]) {
  const successful = rows.filter(row=>row.status==="success");
  const sum = (category: RevenueCategory) => successful.filter(row=>row.category===category).reduce((total,row)=>total+row.amount,0);
  const total = successful.reduce((total,row)=>total+row.amount,0);
  const byVehicle = (["sedan","suv","ev"] as VehicleKind[]).map(kind=>({ kind, total: successful.filter(row=>row.vehicle===kind).reduce((sum,row)=>sum+row.amount,0), count: new Set(successful.filter(row=>row.vehicle===kind).map(row=>row.bookingId)).size }));
  return { total, deposit: sum("deposit"), parking: sum("parking"), overtime: sum("overtime"), penalty: sum("penalty"), held: rows.filter(row=>row.status==="held").reduce((sum,row)=>sum+row.amount,0), refunds: rows.filter(row=>row.status==="refunded").reduce((sum,row)=>sum+row.amount,0), completed: new Set(successful.map(row=>row.bookingId)).size, byVehicle };
}
export function revenueBuckets(rows: RevenueTransaction[], from: string, to: string, group: "day" | "hour") {
  const buckets: { key: string; label: string; parking: number; overtime: number; penalty: number; total: number }[] = [];
  if (!validDateRange(from,to)) return buckets;
  if (group==="hour") for(let hour=0;hour<24;hour+=2) buckets.push({key:String(hour),label:`${String(hour).padStart(2,"0")}:00`,parking:0,overtime:0,penalty:0,total:0});
  else for(let day=from;day<=to;day=shiftDay(day,1)) buckets.push({key:day,label:`${day.slice(8)}/${day.slice(5,7)}`,parking:0,overtime:0,penalty:0,total:0});
  for(const row of rows) {
    if(row.status!=="success")continue;
    const key=group==="day"?row.date:row.time==="—"?"":String(Math.floor(Number(row.time.split(":")[0])/2)*2);
    const bucket=buckets.find(item=>item.key===key); if(!bucket)continue;
    if(row.category==="overtime")bucket.overtime+=row.amount; else if(row.category==="penalty")bucket.penalty+=row.amount; else bucket.parking+=row.amount;
    bucket.total+=row.amount;
  }
  return buckets;
}
export function revenueCsv(rows: RevenueTransaction[]) {
  const cell=(value: unknown)=>{const text=String(value);return `"${(typeof value==="string"&&/^[=+@\-]/.test(text.trimStart())?"'":"")+text.replace(/"/g,'""')}"`;};
  const data=[["Ngày","Giờ","Mã giao dịch mẫu","Mã đặt chỗ","Biển số","Loại xe","Khoản thu","Nguồn","Số tiền VNĐ","Trạng thái"],...rows.map(row=>[row.date,row.time,row.id,row.bookingId,row.plate,row.vehicle,categoryLabels[row.category],row.source,row.status==="refunded"?-row.amount:row.amount,row.status==="success"?"Đã ghi nhận doanh thu":row.status==="held"?"Cọc đang giữ":"Đã hoàn cọc"])];
  return "\uFEFF"+data.map(row=>row.map(cell).join(",")).join("\r\n");
}
