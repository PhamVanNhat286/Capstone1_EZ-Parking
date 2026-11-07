<?php
// PHP CLI only: verifies the exact database the app will use, never prints credentials.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__).'/api/config.php';
try {
    if (!extension_loaded('pdo_mysql')) throw new RuntimeException('PHP chua bat pdo_mysql.');
    $pdo=db();
    $info=$pdo->query('SELECT DATABASE() AS dbname, @@port AS server_port')->fetch();
    if (($info['dbname']??'') !== 'ez_space') throw new RuntimeException('Database dang ket noi khong phai ez_space.');
    echo "MY SQL OK | Database: ".$info['dbname']." | Port server: ".$info['server_port'].PHP_EOL;
    $tables=['users','parking_lots','slots','reservations','payments','vehicles','parking_sessions','qr_tickets','pricing_rules','audit_logs','email_otps','manager_history','app_settings','parking_lot_managers','parking_lot_vehicle_types'];
    $errors=[];
    foreach ($tables as $table) {
        try {
            $count=(int)$pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn();
            echo sprintf("%-28s %d".PHP_EOL,$table,$count);
        } catch (Throwable $e) { $errors[]=$table; echo "MISSING/ERROR ".$table.PHP_EOL; }
    }
    if ($errors) {fwrite(STDERR,"Loi bang SQL: ".implode(', ',$errors).PHP_EOL); exit(2);}
    $admin=(int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin' AND status='active'")->fetchColumn();
    if ($admin<1) throw new RuntimeException('Thieu user admin active trong bang users de ghi audit log.');
    echo "Kiem tra thanh cong: 15 bang + admin active. Du lieu tai tu MySQL that.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "LOI KET NOI DB: ".$e->getMessage().PHP_EOL);
    exit(1);
}
