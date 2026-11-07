/* Thao tác settings-save; API ghi dữ liệu MySQL (không phải dữ liệu demo). */
async function saveSettings(form){
 const v={hold_minutes:Number($('#hold').value),no_show_minutes:Number($('#no-show').value),commission_percent:Number($('#commission').value),maintenance:$('#maintenance').checked};
 await api('settings','POST',v);settingDirty=false;notice('Đã lưu cài đặt vào MySQL và ghi audit log.');await load(true);
}
