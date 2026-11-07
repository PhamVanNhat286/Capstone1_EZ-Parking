/* Thao tác user-status; API ghi dữ liệu MySQL (không phải dữ liệu demo). */
async function mutateUser(kind,id){
 const to=kind==='user-lock'?'banned':'active';
 const row=lastData.items.find(x=>n(x.id)===id);if(!confirm(`${to==='banned'?'Khóa':'Mở khóa'} tài khoản ${row?.full_name||'#'+id}?`))return;
 await api('user_status','POST',{id,status:to});notice('Trạng thái người dùng đã được lưu.');await load(true);
}
