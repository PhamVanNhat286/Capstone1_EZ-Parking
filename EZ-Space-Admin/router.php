<?php
// EZ-Space: local-only development router, do not expose on LAN or public internet.
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
$host = (string)($_SERVER['HTTP_HOST'] ?? '');
if (!in_array($ip,['127.0.0.1','::1'],true) ||
    !preg_match('/^(?:localhost|127\.0\.0\.1)(?::[0-9]{1,5})?$/i',$host)) {
    http_response_code(403); exit('Localhost only');
}
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if ($path === '/') return false; // index.html
if (str_contains($path, "\0") ||
    preg_match('~(^|/)(\.|sql(?:/|$)|scripts(?:/|$)|README(?:\.|$)|router\.php$|api/(?:config|cron)\.php$|api/controllers(?:/|$)|package(?:-lock)?\.json$|CHAY_APP\.bat$)~i', $path) ||
    preg_match('~\.(?:env|sql|ps1|md|json|ini|log|bak)$~i', $path)) {
    http_response_code(404); exit('Not found');
}
$root = realpath(__DIR__);
$target = realpath($root . $path);
if ($target === false || !str_starts_with($target, $root . DIRECTORY_SEPARATOR) || !is_file($target)) {
    http_response_code(404); exit('Not found');
}
return false;
