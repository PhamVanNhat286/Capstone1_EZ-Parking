<?php
// Cau hinh XAMPP: co the doi bang bien moi truong EZ_DB_*.
declare(strict_types=1);
const APP_TIMEZONE = 'Asia/Ho_Chi_Minh';
date_default_timezone_set(APP_TIMEZONE);
function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;
    $host = getenv('EZ_DB_HOST') ?: '127.0.0.1';
    $port = getenv('EZ_DB_PORT') ?: '3307';
    $database = getenv('EZ_DB_NAME') ?: 'ez_space';
    $user = getenv('EZ_DB_USER') ?: 'root';
    $pass = getenv('EZ_DB_PASS');
    if ($pass === false) $pass = ''; // Tai khoan root khong mat khau chi dung thu tren may ca nhan.
    $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+07:00'");
    return $pdo;
}
function startAdminSession(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'httponly' => true, 'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'path' => '/',
    ]);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
}
function reply(array $data, int $status=200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, private');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function rows(PDO $db, string $sql, array $params=[]): array {
    $q=$db->prepare($sql); $q->execute($params); return $q->fetchAll();
}
function one(PDO $db, string $sql, array $params=[]): array {
    return rows($db, $sql, $params)[0] ?? [];
}
function body(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) reply(['error'=>'JSON không hợp lệ.'],400);
    return $data;
}
function audit(PDO $db, ?int $actor, ?int $lot, string $action, string $table, int $id, $before, $after, string $note=''): void {
    $q=$db->prepare('INSERT INTO audit_logs (user_id,parking_lot_id,action,entity_type,entity_id,old_value,new_value,note) VALUES (?,?,?,?,?,?,?,?)');
    $q->execute([$actor,$lot,$action,$table,$id, $before===null?null:json_encode($before,JSON_UNESCAPED_UNICODE), $after===null?null:json_encode($after,JSON_UNESCAPED_UNICODE), (function_exists('mb_substr') ? mb_substr($note,0,255) : substr($note,0,250))]);
}
function rangeDates(string $range): array {
    $now=new DateTimeImmutable('now',new DateTimeZone(APP_TIMEZONE));
    $day=$now->setTime(0,0);
    $start=match($range) {
        'today' => $day,
        'week' => $day->modify('-6 days'),
        'month' => $day->modify('first day of this month'),
        'all' => new DateTimeImmutable('2000-01-01 00:00:00',new DateTimeZone(APP_TIMEZONE)),
        default => throw new InvalidArgumentException('Khoảng thời gian không hợp lệ.'),
    };
    return [$start->format('Y-m-d H:i:s'), $now->modify('+1 second')->format('Y-m-d H:i:s')];
}
