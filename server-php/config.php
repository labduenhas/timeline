<?php
// =====================================================================
// ACERVO TIMELINE — Configurações do Banco e Uploads
// Edite os dados abaixo com as informações do seu MariaDB no DirectAdmin
// Senhas reais: use config.local.php (não versionado).
// =====================================================================

if (is_file(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', 'anarcopu_timeline');
if (!defined('DB_USER')) define('DB_USER', 'anarcopu_timeline');
if (!defined('DB_PASS')) define('DB_PASS', 'SUA_SENHA_AQUI');
if (!defined('DB_CHARSET')) define('DB_CHARSET', 'utf8mb4');

if (!defined('ADMIN_SECRET')) {
    $adminSecret = getenv('ADMIN_SECRET');
    define('ADMIN_SECRET', is_string($adminSecret) ? $adminSecret : '');
}

// Diretório local onde os arquivos e imagens serão salvos
define('UPLOADS_DIR', __DIR__ . '/uploads');

// URL pública base para servir os uploads
// Se deixar vazio, a API detecta automaticamente o domínio atual
define('UPLOADS_BASE_URL', ''); 

// Limite de tamanho de arquivo em bytes (100MB)
define('MAX_FILE_SIZE', 100 * 1024 * 1024);

// Extensões e tipos MIME permitidos para upload
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/ogg'
]);
