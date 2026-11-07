/* Thao tác lot-status; API ghi dữ liệu MySQL (không phải dữ liệu demo). */
async function mutateLot(kind,id){
 const map={'lot-approve':'active','lot-reject':'rejected','lot-suspend':'inactive','lot-activate':'active','lot-reconsider':'pending'};
 const to=map[kind];if(!to)return;
 const row=lastData?.items?.find(x=>n(x.id)===id)||lastData?.pending?.find(x=>n(x.id)===id);
 const name=row?.name||`#${id}`;let reason='';
 if(to==='rejected'||to==='inactive') {reason=prompt(`Lý do ${to==='rejected'?'từ chối':'tạm ngừng'} "${name}"?`,'');if(reason===null)return;if(reason.trim().length<3){notice('Vui lòng nhập lý do ít nhất 3 ký tự.','bad');return;}}
 else if(!confirm(`Xác nhận đổi "${name}" sang "${LOT[to]}"?`))return;
 await api('lot_status','POST',{id,status:to,reason});notice(`Đã cập nhật bãi ${name} trong MySQL.`);closeModal();await load(true);
}
