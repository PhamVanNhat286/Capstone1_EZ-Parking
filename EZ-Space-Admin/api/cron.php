<?php
// Run from Task Scheduler: C:\xampp\php\php.exe C:\xampp\htdocs\ez-space-admin\api\cron.php
// CLI only: avoid exposing a URL that mutates data.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit('Forbidden'); }
require_once __DIR__.'/config.php';
$db=db();
$lock=one($db,"SELECT GET_LOCK('ezspace_booking_expiration',0) AS acquired");
if ((int)($lock['acquired']??0)!==1) { echo "Đã có cron đang chạy.\n"; exit(0); }
$counts=['holding_expired'=>0,'no_show'=>0];
try {
    $db->beginTransaction();
    foreach ([['holding','hold_expires_at','cancelled','HOLD_EXPIRED'], ['paid','arrival_expires_at','forfeited','NO_SHOW_FORFEITED']] as [$from,$column,$to,$action]) {
        // Column name comes exclusively from trusted constant array above.
        $records=rows($db,"SELECT id,slot_id,parking_lot_id,status FROM reservations WHERE status=? AND {$column} IS NOT NULL AND {$column}<NOW() ORDER BY id LIMIT 500 FOR UPDATE",[$from]);
        foreach($records as $r) {
            $id=(int)$r['id']; $slot=(int)$r['slot_id']; $lot=(int)$r['parking_lot_id'];
            $update=$db->prepare("UPDATE reservations SET status=?,cancelled_at=CASE WHEN ?='cancelled' THEN NOW() ELSE cancelled_at END,cancel_reason=? WHERE id=? AND status=?");
            $update->execute([$to,$to,$action==='HOLD_EXPIRED'?'Hết hạn thanh toán cọc':'Không đến bãi trong thời hạn',$id,$from]);
            $db->prepare("UPDATE qr_tickets SET status='expired' WHERE reservation_id=? AND status='active'")->execute([$id]);
            // Never overwrite occupied slots with an active session or another live booking.
            $busy=one($db,"SELECT COUNT(*) c FROM reservations other_r WHERE other_r.slot_id=? AND other_r.id<>? AND other_r.status IN ('holding','paid','entered')",[$slot,$id]);
            $parked=one($db,"SELECT COUNT(*) c FROM parking_sessions ps JOIN reservations r ON r.id=ps.reservation_id WHERE r.slot_id=? AND ps.status='active'",[$slot]);
            if (!(int)$busy['c'] && !(int)$parked['c']) {
                $db->prepare("UPDATE slots SET status='available' WHERE id=? AND status IN ('holding','occupied') AND is_active=1")->execute([$slot]);
            }
            audit($db,null,$lot,$action,'reservations',$id,['status'=>$from],['status'=>$to],$action==='HOLD_EXPIRED'?'Giữ chỗ quá hạn':'Khách không đến bãi trong thời hạn');
            $counts[$from==='holding'?'holding_expired':'no_show']++;
        }
    }
    $db->commit();
} catch(Throwable $e) { if($db->inTransaction())$db->rollBack(); error_log($e->getMessage()); exit(1); }
finally { $db->query("SELECT RELEASE_LOCK('ezspace_booking_expiration')"); }
echo json_encode($counts,JSON_UNESCAPED_UNICODE)."\n";
