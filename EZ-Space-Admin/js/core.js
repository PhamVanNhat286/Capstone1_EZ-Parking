/* EZ-Space Admin: real PHP API + MySQL; no hard-coded dashboard data. */
'use strict';
const PAGE=document.body.dataset.page;
const $=(sel,base=document)=>base.querySelector(sel);
const $$=(sel,base=document)=>[...base.querySelectorAll(sel)];
const e=value=>String(value??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const n=value=>Number(value)||0;
const nf=value=>n(value).toLocaleString('vi-VN');
const money=value=>`${nf(value)} ₫`;
const dt=value=>value?e(String(value).replace('T',' ').slice(0,19)):'—';
const ROLE={customer:'Khách hàng',manager:'Chủ bãi',admin:'Quản trị viên'};
const LOT={pending:'Chờ duyệt',active:'Hoạt động',inactive:'Tạm ngừng',rejected:'Từ chối'};
const USER={active:'Hoạt động',inactive:'Ngừng hoạt động',banned:'Bị khóa'};
const RES={holding:'Giữ chỗ',paid:'Đã cọc',entered:'Đã vào',completed:'Hoàn thành',cancelled:'Đã hủy',forfeited:'No-show',refunded:'Đã hoàn'};
const COLORS={active:'ok',available:'ok',success:'ok',completed:'ok',entered:'ok',pending:'warn',holding:'warn',paid:'brand',inactive:'muted',cancelled:'bad',rejected:'bad',banned:'bad',forfeited:'bad',occupied:'bad',unavailable:'muted',failed:'bad',refunded:'muted'};
const pill=(key,label)=>`<span class="pill ${COLORS[key]||'muted'}">${e(label??key)}</span>`;
const actionButton=(kind,id,label,style='')=>`<button class="btn btn-sm ${style}" data-do="${e(kind)}" data-id="${n(id)}">${e(label)}</button>`;
let csrf='',lastData=null,summary=null,viewRange=PAGE==='dashboard'?'today':'month',tab=PAGE==='records'?'reservations':'all',search='',lastRequest=0,settingDirty=false,noticeTimer;
function notice(msg,type='ok'){
 const el=$('#toast');if(!el){alert(msg);return;}
 $('#toast-msg').textContent=msg;$('#toast-icon').textContent=type==='bad'?'error':'check_circle';el.className='toast show '+type;
 clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>el.classList.remove('show'),3600);
}
function banner(msg){const b=$('#error-banner');b.hidden=!msg;if(msg)b.textContent=msg;}
async function api(action,method='GET',data,params={}){
 const url=new URL('api/index.php',window.location.href);url.searchParams.set('action',action);
 Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));
 const opt={method,credentials:'same-origin',cache:'no-store',headers:{'Accept':'application/json'}};
 if(method!=='GET'){opt.headers['Content-Type']='application/json';opt.headers['X-CSRF-Token']=csrf;opt.body=JSON.stringify(data||{});}
 const response=await fetch(url,opt);let result;
 try{result=await response.json();}catch(_){throw new Error('PHP API không trả về JSON. Kiểm tra PHP API trên localhost:8000.');}
 if(response.status===401 || result.login_required){throw new Error('API từ chối yêu cầu. Kiểm tra server PHP và localhost.');}
 if(!response.ok)throw new Error(result.error||`Lỗi HTTP ${response.status}`);
 return result;
}
function kpi(label,value,icon='analytics',sub=''){
 return `<div class="card kpi"><div class="kpi-top"><span>${e(label)}</span><div class="ico brand"><span class="ms">${e(icon)}</span></div></div><div class="kpi-value">${e(value)}</div><div class="kpi-sub">${sub}</div></div>`;
}
function section(title,body,subtitle=''){
 return `<section class="card live-section"><div class="card-head"><div><h2>${e(title)}</h2>${subtitle?`<p>${e(subtitle)}</p>`:''}</div></div>${body}</section>`;
}
function table(headers,rows,empty='Không có dữ liệu phù hợp'){
 return `<div class="table-wrap"><table class="upper live-table"><thead><tr>${headers.map(x=>`<th>${e(x)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.join(''):`<tr><td colspan="${headers.length}" class="live-empty">${e(empty)}</td></tr>`}</tbody></table></div>`;
}
function ranges(){return `<div class="live-toolbar"><div class="live-filters">${[['today','Hôm nay'],['week','7 ngày'],['month','Tháng này'],['all','Tất cả']].map(([key,name])=>`<button data-range="${key}" class="btn btn-sm ${viewRange===key?'btn-primary':''}">${name}</button>`).join('')}</div><span class="muted">Các số liệu giao dịch dựa trên thời gian thanh toán thành công.</span></div>`;}
function controls(names){return `<div class="live-toolbar"><div class="live-filters">${names.map(([key,name])=>`<button class="btn btn-sm ${tab===key?'btn-primary':''}" data-filter="${key}">${e(name)}</button>`).join('')}</div><div class="live-toolbar-right"><input class="live-search" id="list-search" aria-label="Tìm kiếm" placeholder="Tìm theo tên, mã hoặc thông tin..." value="${e(search)}"><button class="btn btn-sm" data-export>Xuất CSV</button></div></div>`;}

// Bộ lọc dùng chung cho các trang danh sách.
function filterRows(items,kind){return items.filter(x=>{
 let accepts=tab==='all'||(kind==='users'&&tab==='manager'&&x.role==='manager')||(kind==='users'&&tab==='customer'&&x.role==='customer')||(kind==='users'&&tab==='banned'&&x.status==='banned')||(kind==='lots'&&tab===x.status)||(kind==='logs'&&tab===x.action);
 if(!accepts)return false;
 if(!search)return true;
 return Object.values(x).some(v=>String(v??'').toLocaleLowerCase('vi-VN').includes(search.toLocaleLowerCase('vi-VN')));
});}
