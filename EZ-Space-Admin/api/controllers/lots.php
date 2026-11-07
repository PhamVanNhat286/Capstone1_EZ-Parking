<?php
// Handler lots: được gọi duy nhất bởi api/index.php sau xác thực localhost và CSRF.
if (!defined('EZ_API_ENTRY')) { http_response_code(404); exit; }
    if ($action==='lots' && $method==='GET') {
        $data=rows($db,"SELECT l.*, (SELECT GROUP_CONCAT(DISTINCT CONCAT(u.full_name,' (',u.email,')') SEPARATOR ', ') FROM parking_lot_managers pm JOIN users u ON u.id=pm.manager_id WHERE pm.parking_lot_id=l.id) managers, (SELECT GROUP_CONCAT(vehicle_type SEPARATOR ', ') FROM parking_lot_vehicle_types v WHERE v.parking_lot_id=l.id) vehicle_types, (SELECT COUNT(*) FROM slots s WHERE s.parking_lot_id=l.id) slot_total, (SELECT COUNT(*) FROM slots s WHERE s.parking_lot_id=l.id AND s.status='available' AND s.is_active=1) slot_available, (SELECT COUNT(*) FROM slots s WHERE s.parking_lot_id=l.id AND s.status='occupied' AND s.is_active=1) slot_occupied, (SELECT COUNT(*) FROM slots s WHERE s.parking_lot_id=l.id AND s.status='holding' AND s.is_active=1) slot_holding, (SELECT MIN(hourly_rate) FROM pricing_rules p WHERE p.parking_lot_id=l.id) min_rate, (SELECT COUNT(*) FROM reservations r WHERE r.parking_lot_id=l.id) reservations FROM parking_lots l ORDER BY FIELD(l.status,'pending','active','inactive','rejected'),l.id DESC");
        reply(['items'=>$data]);
    }
    if ($action==='lot' && $method==='GET') {
        $id=filter_var($_GET['id']??null,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]);
        if (!$id) reply(['error'=>'ID bãi không hợp lệ.'],400);
        $lot=one($db,'SELECT * FROM parking_lots WHERE id=?',[$id]);
        if (!$lot) reply(['error'=>'Không tìm thấy bãi.'],404);
        reply(['lot'=>$lot,'slots'=>rows($db,'SELECT * FROM slots WHERE parking_lot_id=? ORDER BY row_index,col_index',[$id]),'pricing'=>rows($db,'SELECT * FROM pricing_rules WHERE parking_lot_id=? ORDER BY start_time',[$id]),'managers'=>rows($db,'SELECT u.id,u.full_name,u.email,u.phone FROM parking_lot_managers m JOIN users u ON m.manager_id=u.id WHERE m.parking_lot_id=?',[$id]),'vehicles'=>rows($db,'SELECT vehicle_type FROM parking_lot_vehicle_types WHERE parking_lot_id=?',[$id]),'reservations'=>rows($db,'SELECT status,COUNT(*) amount FROM reservations WHERE parking_lot_id=? GROUP BY status',[$id])]);
    }
    if ($action==='lot_status' && $method==='POST') {
        $in=body(); $id=(int)($in['id']??0); $to=(string)($in['status']??'');
        $reason=trim((string)($in['reason']??''));
        if ($id<1 || !in_array($to,['active','inactive','rejected','pending'],true)) reply(['error'=>'Yêu cầu không hợp lệ.'],400);
        if (in_array($to,['rejected','inactive'],true) && strlen($reason)<3) reply(['error'=>'Cần lý do từ chối hoặc tạm dừng (ít nhất 3 ký tự).'],400);
        $transitions=['pending'=>['active','rejected'],'active'=>['inactive'],'inactive'=>['active','pending'],'rejected'=>['pending']];
        $db->beginTransaction();
        try {
            $old=one($db,'SELECT id,name,status,approved_by,approved_at FROM parking_lots WHERE id=? FOR UPDATE',[$id]);
            if (!$old) { $db->rollBack(); reply(['error'=>'Không tìm thấy bãi.'],404); }
            if (!in_array($to,$transitions[$old['status']]??[],true)) { $db->rollBack(); reply(['error'=>'Không thể chuyển trạng thái từ '.$old['status'].' sang '.$to.'.'],409); }
            $q=$db->prepare("UPDATE parking_lots SET status=?,approved_by=CASE WHEN ?='active' THEN ? ELSE approved_by END,approved_at=CASE WHEN ?='active' THEN NOW() ELSE approved_at END WHERE id=?");
            $q->execute([$to,$to,$actor,$to,$id]);
            $new=one($db,'SELECT id,name,status,approved_by,approved_at FROM parking_lots WHERE id=?',[$id]);
            audit($db,$actor,$id,'LOT_STATUS_CHANGED','parking_lots',$id,$old,$new,$reason ?: 'Đổi trạng thái bãi đỗ qua Admin Portal');
            $db->commit(); reply(['ok'=>true,'item'=>$new]);
        } catch(Throwable $e){ if($db->inTransaction()) $db->rollBack(); throw $e; }
    }
