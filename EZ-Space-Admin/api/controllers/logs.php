<?php
// Handler logs: được gọi duy nhất bởi api/index.php sau xác thực localhost và CSRF.
if (!defined('EZ_API_ENTRY')) { http_response_code(404); exit; }
    if ($action==='logs' && $method==='GET') {
        $items=rows($db,"SELECT a.*,u.full_name actor,u.role actor_role,l.name lot_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN parking_lots l ON l.id=a.parking_lot_id ORDER BY a.id DESC LIMIT 500");
        $manager=rows($db,"SELECT h.*,u.full_name actor,l.name lot_name FROM manager_history h JOIN users u ON u.id=h.manager_id JOIN parking_lots l ON l.id=h.parking_lot_id ORDER BY h.id DESC LIMIT 300");
        reply(['items'=>$items,'manager_history'=>$manager]);
    }
