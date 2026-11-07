<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
startAdminSession();
// Phien ban mot may: khong dang nhap EZ-Space. Chi chap nhan ket noi loopback.
$remote = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$hostHeader = (string)($_SERVER['HTTP_HOST'] ?? '');
if (!in_array($remote, ['127.0.0.1','::1'], true) ||
    !preg_match('/^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/i', $hostHeader)) {
    reply(['error'=>'API chi cho phep truy cap tu localhost.'], 403);
}
header('X-Frame-Options: DENY');
$action = $_GET['action'] ?? 'summary';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
try {
    if (in_array($action,['login','logout'],true)) reply(['error'=>'Che do dang nhap da duoc go bo.'],404);
    if ($action === 'auth' && $method === 'GET') {
        // Giu endpoint cu de cac phien ban client co the tuong thich, khong yeu cau mat khau.
        reply(['authenticated'=>true, 'user'=>'Quan tri cuc bo', 'local_only'=>true, 'csrf'=>$_SESSION['csrf']]);
    }
    if ($method==='POST') {
        $csrf=(string)($_SERVER['HTTP_X_CSRF_TOKEN']??'');
        if (!$csrf || !hash_equals((string)($_SESSION['csrf']??''),$csrf)) reply(['error'=>'CSRF token khong hop le. Tai lai trang va thu lai.'],403);
        $origin=(string)($_SERVER['HTTP_ORIGIN']??'');
        if ($origin !== '') {
            $expected='http://'.$hostHeader;
            if (!hash_equals($expected,$origin)) reply(['error'=>'Yeu cau khong cung nguon (origin).'],403);
        }
    }
    // Dung tai khoan admin dang active trong database lam actor ghi audit log;
    // KHONG can dang nhap mat khau hoac tao session dang nhap.
    $db=db();
    $admin=one($db,"SELECT id FROM users WHERE role='admin' AND status='active' ORDER BY id LIMIT 1");
    if (!$admin) reply(['error'=>'Database chua co admin active de ghi audit log. Vui long kiem tra seed.'],503);
    $actor=(int)$admin['id'];

    // Route tường minh: controller theo nghiệp vụ, không nối đường dẫn từ input người dùng.
    $controllers = [
        'summary'=>'summary', 'dashboard'=>'dashboard',
        'lots'=>'lots','lot'=>'lots','lot_status'=>'lots',
        'users'=>'users','user_status'=>'users',
        'revenue'=>'revenue','logs'=>'logs','records'=>'records','settings'=>'settings',
    ];
    if (!isset($controllers[$action])) reply(['error'=>'API không tồn tại.'],404);
    define('EZ_API_ENTRY', true);
    require __DIR__ . '/controllers/' . $controllers[$action] . '.php';
    reply(['error'=>'API không tồn tại hoặc phương thức HTTP không hỗ trợ.'],404);
} catch(InvalidArgumentException $e) {
    reply(['error'=>$e->getMessage()],400);
} catch(PDOException $e) {
    error_log('EZ-Space PDO error: '.$e->getMessage());
    reply(['error'=>'Không thể truy vấn MySQL. Kiểm tra MySQL, cấu hình kết nối và các bảng SQL.'],503);
} catch(Throwable $e) {
    error_log('EZ-Space API error: '.$e->getMessage());
    reply(['error'=>'Lỗi máy chủ. Kiểm tra PHP error log.'],500);
}
