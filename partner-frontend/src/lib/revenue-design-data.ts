// Reference content from Figma frame 7:6955. Keep the initial view stable for design review.
export type ReportCategory = "deposit" | "parking" | "overtime" | "penalty";
export type ReportRow = { date: string; time: string; booking: string; plate: string; seats: number; category: ReportCategory; source: string; id: string; amount: number };
export const reportLabels: Record<ReportCategory, string> = { deposit: "Tiền cọc", parking: "Tiền gửi đỗ", overtime: "Phí lố giờ", penalty: "Phạt No-show" };
const firstRows: ReportRow[] = [
  {date:"2026-10-29",time:"14:15",booking:"#EZ-8921",plate:"43A-981.22",seats:4,category:"deposit",source:"VNPay Sandbox",id:"VNP202610290142",amount:50000},
  {date:"2026-10-29",time:"13:50",booking:"#EZ-8918",plate:"51F-102.83",seats:4,category:"parking",source:"Thu tại cổng",id:"CS202610290811",amount:40000},
  {date:"2026-10-29",time:"13:20",booking:"#EZ-8915",plate:"43C-319.44",seats:7,category:"overtime",source:"Thu tại cổng",id:"CS202610297120",amount:25000},
  {date:"2026-10-29",time:"12:45",booking:"#EZ-8904",plate:"92A-441.09",seats:4,category:"penalty",source:"VNPay Sandbox",id:"VNP202610290098",amount:50000},
  {date:"2026-10-29",time:"11:30",booking:"#EZ-8899",plate:"30E-882.17",seats:7,category:"parking",source:"VNPay Sandbox",id:"VNP202610290074",amount:75000},
  {date:"2026-10-29",time:"10:15",booking:"#EZ-8896",plate:"43A-671.05",seats:4,category:"deposit",source:"VNPay Sandbox",id:"VNP202610290021",amount:50000},
];
// Additional deterministic demo transactions allow the reference tabs, filters and pagination to work.
const totals: [ReportCategory,number,number][] = [["deposit",295,12600000],["parking",48,32100000],["overtime",48,2100000],["penalty",21,1450000]];
let sequence = 0;
export const reportRows: ReportRow[] = [...firstRows, ...totals.flatMap(([category,count,total]) => {
  const initial = firstRows.filter(row=>row.category===category);
  const remaining = count-initial.length;
  const amount = total-initial.reduce((sum,row)=>sum+row.amount,0);
  const base = Math.floor(amount/remaining/1000)*1000;
  return Array.from({length:remaining},(_,i) => {
    const n=sequence++;
    const date=`2026-10-${String(28-Math.floor(n/15)%28).padStart(2,"0")}`;
    return {date,time:`${String(18-n%12).padStart(2,"0")}:${n%2?"30":"00"}`,booking:`#EZ-${8890-n}`,plate:`43A-${String(120+n).padStart(3,"0")}.${String(n%100).padStart(2,"0")}`,seats:n<130?7:4,category,source:category==="parking"||category==="overtime"?"Thu tại cổng":"VNPay Sandbox",id:`DEMO-${String(n+1).padStart(6,"0")}`,amount:base+(i===remaining-1?amount-base*remaining:0)};
  });
})].sort((a,b)=>`${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
export const chartDays=["01","03","05","07","09","11","13","15","17","19","21","24","26","28","29"];
// SVG coordinates measured directly from the 924 × 320 chart in the reference frame.
export const chartSegments = [[70,14,6],[85,15,6],[110,18,8],[130,20,8],[100,14,6],[120,20,8],[140,20,8],[125,20,6],[150,22,8],[135,20,8],[160,25,8],[185,28,16],[145,22,6],[155,22,6],[120,18,6]];
