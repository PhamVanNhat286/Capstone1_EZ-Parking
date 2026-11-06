// Content and ledger counters from Figma frame 7:8525. These six rows are UI fixtures,
// not a security audit trail or proof of cryptographic verification by a backend.
export type AuditAction = "UPDATE_PRICING" | "FORCE_CANCEL" | "LOCK_SLOT" | "UPDATE_LAYOUT" | "UPDATE_CAPACITY" | "UPDATE_LOT_INFO";
export type AuditEntry = Readonly<{
  id:string; date:string; time:string; manager:string; initials:string; role:string;
  action:AuditAction; object:string; context:string; before:string; after:string; reason:string;
}>;
export const auditActions:ReadonlyArray<{id:AuditAction|"all";label:string;short:string;count:number}> = [
  {id:"all",label:"Tất cả thao tác",short:"Tất cả",count:68},
  {id:"UPDATE_PRICING",label:"Cập nhật bảng giá",short:"Giá",count:15},
  {id:"UPDATE_LAYOUT",label:"Cập nhật sơ đồ",short:"Sơ đồ",count:18},
  {id:"FORCE_CANCEL",label:"Hủy đơn cưỡng chế",short:"Hủy đơn",count:5},
  {id:"LOCK_SLOT",label:"Khóa ô đỗ",short:"Khóa ô",count:10},
  {id:"UPDATE_CAPACITY",label:"Cập nhật sức chứa",short:"Sức chứa",count:8},
  {id:"UPDATE_LOT_INFO",label:"Cập nhật thông tin bãi",short:"Thông tin",count:12},
];
export const auditEntries:ReadonlyArray<AuditEntry> = [
  {id:"AUD-20261029-001",date:"2026-10-29",time:"14:05:12",manager:"Minh Trần",initials:"MT",role:"Quản lý trưởng",action:"UPDATE_PRICING",object:"Bảng giá tiêu chuẩn",context:"Xe ô tô đến 4 chỗ",before:"20.000đ",after:"25.000đ/giờ",reason:"Điều chỉnh khung giá cao điểm."},
  {id:"AUD-20261029-002",date:"2026-10-29",time:"11:20:44",manager:"Minh Trần",initials:"MT",role:"Quản lý trưởng",action:"FORCE_CANCEL",object:"Đơn #EZ-8902",context:"Ô đỗ A-04 · 43A-981.22",before:"Đang giữ chỗ",after:"Hủy cưỡng chế & Hoàn cọc 100%",reason:"Khách báo xe gặp sự cố."},
  {id:"AUD-20261029-003",date:"2026-10-29",time:"09:30:05",manager:"Lê Hoàng",initials:"LH",role:"Điều hành ca",action:"LOCK_SLOT",object:"Vị trí B-02",context:"Khu vực xe gầm cao",before:"Trống",after:"Khóa bảo trì",reason:"Sơn lại vạch kẻ vạch đỗ."},
  {id:"AUD-20261028-001",date:"2026-10-28",time:"16:45:30",manager:"Minh Trần",initials:"MT",role:"Quản lý trưởng",action:"UPDATE_LAYOUT",object:"Sơ đồ tầng 1",context:"Phân khu A & Lối ra",before:"Sơ đồ đã lưu",after:"+4 ô mới · Đổi 2 ô EV sạc nhanh",reason:"Cải tạo khu vực lối thoát hiểm thành thêm ô đỗ."},
  {id:"AUD-20261028-002",date:"2026-10-28",time:"10:10:18",manager:"Minh Trần",initials:"MT",role:"Quản lý trưởng",action:"UPDATE_CAPACITY",object:"Sức chứa toàn bãi",context:"Toàn bộ 2 phân tầng",before:"116 ô",after:"120 ô khả dụng",reason:"Bàn giao hoàn thiện phân khu B2 mở rộng."},
  {id:"AUD-20261027-001",date:"2026-10-27",time:"15:00:10",manager:"Minh Trần",initials:"MT",role:"Quản lý trưởng",action:"UPDATE_LOT_INFO",object:"Thông tin vận hành",context:"Khung giờ mở cửa",before:"22:00",after:"23:00 đóng cửa",reason:"Kéo dài giờ mở cửa phục vụ khách tan ca."},
];

export function filterAudit(entries:ReadonlyArray<AuditEntry>,filter:{query:string;action:AuditAction|"all";manager:string;from:string;to:string}) {
  const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("vi").replace(/đ/g,"d").replace(/[^a-z0-9]/g,"");
  const query=normalize(filter.query);
  return entries.filter(entry=>(filter.action==="all"||entry.action===filter.action)&&(filter.manager==="all"||entry.manager===filter.manager)&&(!filter.from||entry.date>=filter.from)&&(!filter.to||entry.date<=filter.to)&&normalize([entry.id,entry.manager,entry.action,entry.object,entry.context,entry.reason,entry.before,entry.after].join(" ")).includes(query));
}

export function auditCsv(entries:ReadonlyArray<AuditEntry>) {
  const cell=(value:string)=>`"${(/^[=+@\-\t\r]/.test(value)?"'":"")+value.replace(/"/g,'""')}"`;
  return "\uFEFF"+[["Thời gian","Người thực hiện","Vai trò","Loại thao tác","Đối tượng","Ngữ cảnh","Trước thay đổi","Sau thay đổi","Lý do"],...entries.map(entry=>[`${entry.date} ${entry.time}`,entry.manager,entry.role,entry.action,entry.object,entry.context,entry.before,entry.after,entry.reason])].map(row=>row.map(cell).join(",")).join("\r\n");
}
