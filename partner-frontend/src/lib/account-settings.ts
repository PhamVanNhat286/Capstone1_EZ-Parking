export type AccountProfile = Readonly<{name:string;phone:string;email:string}>;
export const initialAccount:AccountProfile = {name:"Minh Trần",phone:"0905 123 456",email:"haichau1@ezspace.vn"};

export function validateAccountProfile(profile:AccountProfile) {
  const name=profile.name.trim().replace(/\s+/g," ");
  const phone=profile.phone.replace(/[\s().-]/g,"");
  const errors:{name?:string;phone?:string}={};
  if(name.length<2||name.length>80)errors.name="Nhập họ tên từ 2 đến 80 ký tự.";
  if(!/^(?:0|\+?84)[35789]\d{8}$/.test(phone))errors.phone="Nhập số điện thoại Việt Nam hợp lệ.";
  return {errors,value:{...profile,name,phone:profile.phone.trim()}};
}

export function avatarFileError(file:{type:string;size:number}) {
  if(!["image/jpeg","image/png"].includes(file.type))return "Chọn ảnh JPG hoặc PNG.";
  if(file.size===0||file.size>2*1024*1024)return "Ảnh phải có dung lượng từ 1 byte đến 2MB.";
  return "";
}

export function profileInitials(name:string) {
  const words=name.trim().split(/\s+/).filter(Boolean);
  return words.length?`${words[0][0]}${words.length>1?words[words.length-1][0]:""}`.toLocaleUpperCase("vi"):"MT";
}

// Validation for a local UI demonstration only. No credentials are stored or sent.
export function demoPasswordError(current:string,next:string,confirmation:string) {
  if(!current)return "Nhập mật khẩu hiện tại để kiểm tra biểu mẫu.";
  if(next.length<8)return "Mật khẩu mới cần ít nhất 8 ký tự.";
  if(next===current)return "Mật khẩu mới cần khác mật khẩu hiện tại.";
  if(next!==confirmation)return "Xác nhận mật khẩu chưa khớp.";
  return "";
}

export const assignedParkingLots = [
  {id:"HC1-DN",name:"Bãi Hải Châu 1",capacity:120,location:"Trung tâm Quận Hải Châu",status:"Đang hoạt động",tone:"active"},
  {id:"NHS2-DN",name:"Bãi Ngũ Hành Sơn 2",capacity:85,location:"Đường Lê Văn Hiến",status:"Chờ duyệt",tone:"pending"},
  {id:"STH-DN",name:"Bãi Sơn Trà Hub",capacity:200,location:"Khu cảng Tiên Sa",status:"Tạm ngưng",tone:"paused"},
] as const;

export type DemoSession = Readonly<{id:string;device:string;location:string;lastSeen:string;current:boolean}>;
export const initialDemoSessions:ReadonlyArray<DemoSession> = [
  {id:"current",device:"Chrome trên Windows",location:"Đà Nẵng, Việt Nam",lastSeen:"Đang hoạt động",current:true},
  {id:"mobile",device:"Safari trên iPhone",location:"Đà Nẵng, Việt Nam",lastSeen:"29/10/2026 · 08:45",current:false},
];

export function endDemoSession(sessions:ReadonlyArray<DemoSession>,id:string) {
  return sessions.filter(session=>session.current||session.id!==id);
}
