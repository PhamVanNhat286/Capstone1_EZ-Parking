<?php
// Handler dashboard: được gọi duy nhất bởi api/index.php sau xác thực localhost và CSRF.
if (!defined('EZ_API_ENTRY')) { http_response_code(404); exit; }
    if ($action==='dashboard' && $method==='GET') {
        [$start,$end]=rangeDates((string)($_GET['range']??'today'));
        $books=one($db,"SELECT COUNT(*) total, SUM(status='holding') holding, SUM(status='paid') paid, SUM(status='entered') entered, SUM(status='completed') completed, SUM(status='cancelled') cancelled, SUM(status='forfeited') forfeited, SUM(status='refunded') refunded FROM reservations WHERE created_at>=? AND created_at<?",[$start,$end]);
        $payments=one($db,"SELECT COUNT(*) transactions, COALESCE(SUM(CASE WHEN status='success' AND payment_type IN ('deposit','final') THEN amount ELSE 0 END),0) received, COALESCE(SUM(CASE WHEN status='success' AND payment_type='deposit' THEN amount ELSE 0 END),0) deposits, COALESCE(SUM(CASE WHEN status='success' AND payment_type='final' THEN amount ELSE 0 END),0) finals, COALESCE(SUM(CASE WHEN status='success' THEN 1 ELSE 0 END),0) successful FROM payments WHERE paid_at>=? AND paid_at<?",[$start,$end]);
        $hourly=rows($db,"SELECT HOUR(created_at) hour, status, COUNT(*) amount FROM reservations WHERE created_at>=? AND created_at<? GROUP BY HOUR(created_at), status ORDER BY hour",[$start,$end]);
        $recent=rows($db,"SELECT r.id,r.status,r.created_at,r.deposit_amount,l.name lot_name,u.full_name customer,s.code slot_code,v.license_plate FROM reservations r JOIN users u ON u.id=r.user_id JOIN parking_lots l ON l.id=r.parking_lot_id JOIN slots s ON s.id=r.slot_id JOIN vehicles v ON v.id=r.vehicle_id ORDER BY r.id DESC LIMIT 12");
        $pending=rows($db,"SELECT l.id,l.name,l.address,l.capacity,l.created_at,GROUP_CONCAT(DISTINCT u.full_name SEPARATOR ', ') managers FROM parking_lots l LEFT JOIN parking_lot_managers m ON m.parking_lot_id=l.id LEFT JOIN users u ON u.id=m.manager_id WHERE l.status='pending' GROUP BY l.id ORDER BY l.created_at ASC LIMIT 10");
        $audit=rows($db,"SELECT a.id,a.action,a.note,a.created_at,a.entity_type,a.entity_id,u.full_name actor FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 8");
        reply(['range'=>['from'=>$start,'to'=>$end], 'books'=>$books,'payments'=>$payments,'hourly'=>$hourly,'recent'=>$recent,'pending'=>$pending,'logs'=>$audit]);
    }
