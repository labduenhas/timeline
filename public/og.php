<?php
$slug = isset($_GET['slug']) ? (string) $_GET['slug'] : '';
$indexPath = __DIR__ . '/index.html';
$index = is_file($indexPath) ? file_get_contents($indexPath) : '';

if ($index === '' || !preg_match('/^[A-Za-z0-9_-]+$/', $slug)) {
    http_response_code($index === '' ? 500 : 404);
    header('Content-Type: text/html; charset=UTF-8');
    echo $index !== '' ? $index : 'Página indisponível.';
    exit;
}

$host = $_SERVER['HTTP_HOST'] ?? 'acervo.anarcopunk.org';
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['SERVER_PORT'] ?? '') === '443');
$origin = ($https ? 'https' : 'http') . '://' . $host;
$pageUrl = $origin . '/doc/' . rawurlencode($slug);

$preview = null;
$api = 'https://api.anarcopunk.org/og/' . rawurlencode($slug);
if (function_exists('curl_init')) {
    $ch = curl_init($api);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($status === 200 && is_string($body)) {
        $preview = json_decode($body, true);
    }
}

$title = is_array($preview) ? trim((string) ($preview['title'] ?? '')) : '';
$description = is_array($preview) ? trim((string) ($preview['description'] ?? '')) : '';
$image = is_array($preview) ? trim((string) ($preview['image'] ?? '')) : '';
if ($description === '') {
    $description = 'Navegador cronológico e arquivo histórico de documentos, multimídia e artigos.';
}
if ($image === '') {
    $image = $origin . '/og.png';
}

if ($title !== '') {
    $esc = static function ($value) {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    };
    $safeTitle = $esc($title);
    $safeDescription = $esc($description);
    $safeImage = $esc($image);
    $safeUrl = $esc($pageUrl);
    $index = preg_replace('/<title>[\s\S]*?<\/title>/', '<title>' . $safeTitle . '</title>', $index, 1);
    $index = preg_replace('/(<meta name="description" content=")[^"]*(")/', '$1' . $safeDescription . '$2', $index, 1);
    $index = preg_replace('/(<meta property="og:title" content=")[^"]*(")/', '$1' . $safeTitle . '$2', $index, 1);
    $index = preg_replace('/(<meta property="og:description" content=")[^"]*(")/', '$1' . $safeDescription . '$2', $index, 1);
    $index = preg_replace('/(<meta property="og:url" content=")[^"]*(")/', '$1' . $safeUrl . '$2', $index, 1);
    $index = preg_replace('/(<meta property="og:image" content=")[^"]*(")/', '$1' . $safeImage . '$2', $index, 1);
    $index = preg_replace('/(<meta name="twitter:title" content=")[^"]*(")/', '$1' . $safeTitle . '$2', $index, 1);
    $index = preg_replace('/(<meta name="twitter:description" content=")[^"]*(")/', '$1' . $safeDescription . '$2', $index, 1);
    $index = preg_replace('/(<meta name="twitter:image" content=")[^"]*(")/', '$1' . $safeImage . '$2', $index, 1);
    if (!empty($preview['image'])) {
        $index = preg_replace('/\s*<meta property="og:image:width" content="1200" \/>/', '', $index, 1);
        $index = preg_replace('/\s*<meta property="og:image:height" content="630" \/>/', '', $index, 1);
    }
}

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: public, max-age=300');
echo $index;
