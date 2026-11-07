/* Giao diện records: chỉ chứa trình bày và dữ liệu cho trang này. */
const RECORD_SETS=[
 ['reservations','Đơn đặt chỗ'],['vehicles','Xe đăng ký'],['slots','Ô đỗ'],
 ['payments','Thanh toán'],['tickets','Vé QR'],['sessions','Phiên đỗ'],['pricing','Quy tắc giá']
];
const RECORD_LABELS={id:'ID',user_id:'ID khách',customer:'Khách hàng',owner:'Chủ xe',lot_name:'Bãi đỗ',parking_lot_id:'ID bãi',slot_id:'ID ô',slot_code:'Mã ô',license_plate:'Biển số',vehicle_name:'Tên xe',vehicle_type:'Loại xe',is_default:'Mặc định',start_time:'Bắt đầu',expected_end_time:'Kết thúc dự kiến',hold_expires_at:'Hạn giữ chỗ',arrival_expires_at:'Hạn tới bãi',hourly_rate:'Giá/giờ',deposit_amount:'Tiền cọc',total_amount:'Tổng tiền',cancelled_at:'Hủy lúc',cancel_reason:'Lý do hủy',created_at:'Tạo lúc',updated_at:'Sửa lúc',row_index:'Hàng',col_index:'Cột',slot_type:'Loại ô',status:'Trạng thái',is_active:'Khả dụng',provider:'Cổng',transaction_ref:'Mã giao dịch',payment_type:'Loại thanh toán',amount:'Số tiền',response_code:'Mã phản hồi',ipn_received_at:'IPN lúc',paid_at:'Trả lúc',reservation_id:'ID đơn',issued_at:'Phát hành',used_at:'Dùng lúc',expires_at:'Hết hạn',check_in_at:'Giờ vào',check_out_at:'Giờ ra',checked_in_by:'Nhân viên vào',checked_out_by:'Nhân viên ra',final_amount:'Tiền cuối',name:'Tên giá',start_time_pricing:'Giờ bắt đầu',end_time:'Giờ kết thúc',surcharge:'Phụ phí',effective_from:'Hiệu lực từ',effective_to:'Hiệu lực đến'};
const MONEY_FIELDS=new Set(['hourly_rate','deposit_amount','total_amount','amount','final_amount','surcharge']);
function records(d){
 const tabs=RECORD_SETS.map(([k,v])=>[k,`${v} (${(d[k]||[]).length})`]);
 const kind=RECORD_SETS.some(([k])=>k===tab)?tab:'reservations';
 const items=d[kind]||[];
 const filtered=items.filter(x=>!search||Object.values(x).some(v=>String(v??'').toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN'))));
 const keys={
  reservations:['id','customer','lot_name','slot_code','license_plate','status','start_time','expected_end_time','hold_expires_at','arrival_expires_at','hourly_rate','deposit_amount','total_amount','cancel_reason','created_at'],
  vehicles:['id','owner','license_plate','vehicle_name','vehicle_type','is_default','created_at'],
  slots:['id','lot_name','code','row_index','col_index','slot_type','status','is_active'],
  payments:['id','reservation_id','lot_name','provider','payment_type','transaction_ref','amount','status','response_code','paid_at'],
  tickets:['id','reservation_id','status','issued_at','used_at','expires_at'],
  sessions:['id','reservation_id','check_in_at','check_out_at','checked_in_by','checked_out_by','final_amount','status'],
  pricing:['id','lot_name','name','start_time','end_time','hourly_rate','surcharge','effective_from','effective_to']
 }[kind];
 const val=(item,key)=>{const v=item[key];if(v===null||v===undefined||v==='')return '—';if(MONEY_FIELDS.has(key))return e(money(v));if(key==='status')return pill(v,RES[v]||LOT[v]||USER[v]||v);if(key==='is_default'||key==='is_active')return Number(v)?'Có':'Không';return e(v);};
 const tabControls=controls(tabs);
 const rows=filtered.map(item=>`<tr>${keys.map(key=>`<td>${val(item,key)}</td>`).join('')}</tr>`);
 return `<div class="grid-4 live-cards">${kpi('Đơn đặt chỗ',nf(d.reservations.length),'event_available')}${kpi('Xe đăng ký',nf(d.vehicles.length),'directions_car')}${kpi('Ô đỗ thiết lập',nf(d.slots.length),'local_parking')}${kpi('Thanh toán',nf(d.payments.length),'payments')}${kpi('Vé QR',nf(d.tickets.length),'qr_code')}${kpi('Phiên đỗ',nf(d.sessions.length),'schedule')}${kpi('Bảng giá',nf(d.pricing.length),'price_change')}${kpi('OTP lưu trữ',nf(d.otp_stats.total),'password',`${nf(d.otp_stats.expired)} đã hết hạn`)}</div>`+
 `<p class="live-explain">Thông tin nhạy cảm như mã OTP, mật khẩu và hash token QR <b>không được trả về API</b>. ${e(d.limits)} Số đếm dưới đây là số bản ghi được tải, không phải khẳng định toàn bộ dữ liệu khi vượt giới hạn.</p>`+
 section(RECORD_SETS.find(([k])=>k===kind)?.[1]||'Nghiệp vụ',tabControls+table(keys.map(k=>RECORD_LABELS[k]||k),rows),`Hiển thị ${filtered.length}/${items.length} bản ghi đang tải từ MySQL`);
}

window.EZ_RENDER = records;
