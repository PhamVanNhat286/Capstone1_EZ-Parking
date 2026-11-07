/* Thao tác modal; API ghi dữ liệu MySQL (không phải dữ liệu demo). */
function modal(title,content){$('#modal-title').textContent=title;$('#modal-content').innerHTML=content;$('#detail-modal').hidden=false;document.body.classList.add('modal-active');}
function closeModal(){$('#detail-modal').hidden=true;document.body.classList.remove('modal-active');}
