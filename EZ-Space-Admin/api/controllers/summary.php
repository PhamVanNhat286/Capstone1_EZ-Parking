<?php
// Handler summary: được gọi duy nhất bởi api/index.php sau xác thực localhost và CSRF.
if (!defined('EZ_API_ENTRY')) { http_response_code(404); exit; }
    if ($action==='summary' && $method==='GET') {
        $users=one($db,"SELECT COUNT(*) total, SUM(role='customer') customers, SUM(role='manager') managers, SUM(role='admin') admins, SUM(status='banned') banned FROM users");
        $lots=one($db,"SELECT COUNT(*) total, SUM(status='active') active, SUM(status='pending') pending, SUM(status='inactive') inactive, SUM(status='rejected') rejected, COALESCE(SUM(capacity),0) capacity FROM parking_lots");
        $slots=one($db,"SELECT COUNT(*) total, SUM(status='available' AND is_active=1) available, SUM(status='holding' AND is_active=1) holding, SUM(status='occupied' AND is_active=1) occupied, SUM(status='unavailable' OR is_active=0) unavailable FROM slots");
        reply(['users'=>$users,'lots'=>$lots,'slots'=>$slots,'server_time'=>date('Y-m-d H:i:s')]);
    }
