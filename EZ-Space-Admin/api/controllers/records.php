<?php
// Handler records: được gọi duy nhất bởi api/index.php sau xác thực localhost và CSRF.
if (!defined('EZ_API_ENTRY')) { http_response_code(404); exit; }
    if ($action==='records' && $method==='GET') {
        $reservations=rows($db,"SELECT r.id,r.user_id,u.full_name customer,r.parking_lot_id,l.name lot_name,r.slot_id,s.code slot_code,v.license_plate,v.vehicle_type,r.start_time,r.expected_end_time,r.status,r.hold_expires_at,r.arrival_expires_at,r.hourly_rate,r.deposit_amount,r.total_amount,r.cancelled_at,r.cancel_reason,r.created_at,r.updated_at FROM reservations r JOIN users u ON u.id=r.user_id JOIN parking_lots l ON l.id=r.parking_lot_id JOIN slots s ON s.id=r.slot_id JOIN vehicles v ON v.id=r.vehicle_id ORDER BY r.id DESC LIMIT 1000");
        $vehicles=rows($db,"SELECT v.id,v.user_id,u.full_name owner,v.license_plate,v.vehicle_name,v.vehicle_type,v.is_default,v.created_at FROM vehicles v JOIN users u ON u.id=v.user_id ORDER BY v.id DESC LIMIT 1000");
        $slots=rows($db,"SELECT s.id,s.parking_lot_id,l.name lot_name,s.code,s.row_index,s.col_index,s.slot_type,s.status,s.is_active,s.created_at FROM slots s JOIN parking_lots l ON l.id=s.parking_lot_id ORDER BY s.parking_lot_id,s.row_index,s.col_index LIMIT 2000");
        $payments=rows($db,"SELECT p.id,p.reservation_id,l.name lot_name,p.provider,p.transaction_ref,p.payment_type,p.amount,p.status,p.response_code,p.ipn_received_at,p.paid_at,p.created_at FROM payments p JOIN reservations r ON r.id=p.reservation_id JOIN parking_lots l ON l.id=r.parking_lot_id ORDER BY p.id DESC LIMIT 1000");
        $tickets=rows($db,"SELECT q.id,q.reservation_id,q.status,q.issued_at,q.used_at,q.expires_at,q.created_at FROM qr_tickets q ORDER BY q.id DESC LIMIT 1000");
        $sessions=rows($db,"SELECT ps.id,ps.reservation_id,ps.check_in_at,ps.check_out_at,ps.checked_in_by,ps.checked_out_by,ps.final_amount,ps.status,ps.created_at FROM parking_sessions ps ORDER BY ps.id DESC LIMIT 1000");
        $pricing=rows($db,"SELECT pr.id,l.name lot_name,pr.parking_lot_id,pr.name,pr.start_time,pr.end_time,pr.hourly_rate,pr.surcharge,pr.effective_from,pr.effective_to FROM pricing_rules pr JOIN parking_lots l ON l.id=pr.parking_lot_id ORDER BY pr.parking_lot_id,pr.id LIMIT 1000");
        $otp=one($db,"SELECT COUNT(*) total, SUM(is_used=1) used, SUM(expires_at < NOW()) expired FROM email_otps");
        reply(['reservations'=>$reservations,'vehicles'=>$vehicles,'slots'=>$slots,'payments'=>$payments,'tickets'=>$tickets,'sessions'=>$sessions,'pricing'=>$pricing,'otp_stats'=>$otp,'limits'=>'Tối đa 1000 bản ghi mỗi bảng; 2000 ô đỗ. Không cung cấp OTP, hash mật khẩu hay token QR.']);
    }
