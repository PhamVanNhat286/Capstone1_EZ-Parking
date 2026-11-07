/* Điều phối trang: lấy dữ liệu API, refresh 20 giây và điều hướng thao tác. */
function render(){
 if(!lastData)return;
 const root=$('#live-root');
 root.innerHTML=window.EZ_RENDER(lastData);
 if(PAGE==='settings'){
   const form=$('#settings-live-form');form?.addEventListener('input',()=>{settingDirty=true;});
   form?.addEventListener('change',()=>{settingDirty=true;});
   form?.addEventListener('submit',async ev=>{ev.preventDefault();try{await saveSettings(form);}catch(err){banner(err.message);notice(err.message,'bad');}});
 }
}
async function load(silent=false){
 if(document.hidden&&!silent)return;
 if(PAGE==='settings'&&settingDirty&&!silent)return;
 const id=++lastRequest;
 const btn=$('#btn-refresh');if(btn)btn.disabled=true;
 try{
  const [s,d]=await Promise.all([api('summary'),api(PAGE==='dashboard'?'dashboard':PAGE,'GET',undefined,PAGE==='dashboard'||PAGE==='revenue'?{range:viewRange}:{})]);
  if(id!==lastRequest)return;
  summary=s;lastData=d;render();banner('');
  $$('#sync-side').forEach(x=>x.textContent=`MySQL đang phản hồi · ${dt(s.server_time)}`);
  $$('#admin-name').forEach(x=>x.textContent=window.adminName||'Quản trị viên');
  $$('#sync-time').forEach(x=>x.textContent='Cập nhật: '+s.server_time.slice(11,19));
  $$('#sync-pill').forEach(x=>x.textContent='Đồng bộ MySQL'); $$('#platform-pct').forEach(x=>x.textContent='Kết nối OK');
  $$('[data-pending-badge]').forEach(x=>{x.textContent=n(s.lots.pending);x.hidden=n(s.lots.pending)===0;});
 }catch(err){if(id!==lastRequest)return;banner(err.message||'Lỗi kết nối');$('#sync-pill').textContent='Mất kết nối';$('#sync-side').textContent='Không truy cập được MySQL'; $$('#platform-pct').forEach(x=>x.textContent='Lỗi kết nối');}
 finally{if(btn)btn.disabled=false;}
}
document.addEventListener('click',async ev=>{
 const button=ev.target.closest('button');if(!button)return;
 try{
 if(button.matches('[data-range]')){viewRange=button.dataset.range;await load(true);return;}
 if(button.matches('[data-filter]')){tab=button.dataset.filter;render();return;}
 if(button.matches('[data-export]')){exportNow();return;}
 if(button.dataset.do){
  const id=n(button.dataset.id);button.disabled=true;
  if(button.dataset.do==='lot-detail'){await lotDetail(id);}
  else if(button.dataset.do.startsWith('lot-')){await mutateLot(button.dataset.do,id);}
  else if(button.dataset.do.startsWith('user-')){await mutateUser(button.dataset.do,id);}
  else if(button.dataset.do==='log-detail'){
    const row=(window.liveLogs||[]).find(x=>n(x.id)===Math.abs(id) && x.source===(id<0?'manager':'admin'));
    if(row)modal('Chi tiết '+row.action,`<pre class="json-pre">${e(JSON.stringify(row,null,2))}</pre>`);
  }
 }
 }catch(err){banner(err.message);notice(err.message,'bad');}finally{button.disabled=false;}
});
document.addEventListener('input',ev=>{if(ev.target.id==='list-search'){
 search=ev.target.value;const start=ev.target.selectionStart;render();const el=$('#list-search');el.focus();el.setSelectionRange(start,start);
}});
$('#modal-close').addEventListener('click',closeModal);
$('#detail-modal').addEventListener('click',ev=>{if(ev.target.id==='detail-modal')closeModal();});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')closeModal();});
$('#btn-refresh').addEventListener('click',()=>{settingDirty=false;load(true);});
(async()=>{
 try{
  const auth=await api('auth');
  csrf=auth.csrf;window.adminName=auth.user;
  await load(true);setInterval(()=>load(),20000);
 }catch(err){banner(err.message||'Không truy cập được backend.');}
})();
