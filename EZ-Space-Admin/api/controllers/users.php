<?php
// Handler users: được gọi duy nhất bởi api/index.php sau xác thực localhost và CSRF.
if (!defined('EZ_API_ENTRY')) { http_response_code(404); exit; }
    if ($action==='users' && $method==='GET') {
        $items=rows($db,"SELECT u.id,u.full_name,u.email,u.phone,u.role,u.status,u.created_at,u.updated_at, (SELECT COUNT(*) FROM vehicles v WHERE v.user_id=u.id) vehicles, (SELECT COUNT(*) FROM reservations r WHERE r.user_id=u.id) reservations, (SELECT COUNT(*) FROM parking_lot_managers m WHERE m.manager_id=u.id) lots FROM users u ORDER BY u.id");
        reply(['items'=>$items]);
    }
    if ($action==='user_status' && $method==='POST') {
        $in=body(); $id=(int)($in['id']??0); $to=(string)($in['status']??'');
        if ($id<1 || !in_array($to,['active','banned','inactive'],true)) reply(['error'=>'Trạng thái không hợp lệ.'],400);
        $db->beginTransaction();
        try {
            $old=one($db,'SELECT id,full_name,role,status FROM users WHERE id=? FOR UPDATE',[$id]);
            if (!$old) {$db->rollBack(); reply(['error'=>'Không tìm thấy tài khoản.'],404);}
            if ($id===$actor || $old['role']==='admin') {$db->rollBack(); reply(['error'=>'Không thể thay đổi quyền tài khoản quản trị.'],403);}
            if ($old['status']===$to) {$db->rollBack(); reply(['error'=>'Trạng thái đã được áp dụng.'],409);}
            $q=$db->prepare('UPDATE users SET status=? WHERE id=?'); $q->execute([$to,$id]);
            $new=one($db,'SELECT id,full_name,role,status FROM users WHERE id=?',[$id]);
            audit($db,$actor,null,'USER_STATUS_CHANGED','users',$id,$old,$new,trim((string)($in['reason']??'')) ?: 'Cập nhật tài khoản từ Admin Portal');
            $db->commit(); reply(['ok'=>true,'item'=>$new]);
        }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
    }
