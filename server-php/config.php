<?php
// =====================================================================
// ACERVO TIMELINE — Configurações do Banco e Uploads
// Edite os dados abaixo com as informações do seu MariaDB no DirectAdmin
// =====================================================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'anarcopu_timeline');     // Nome do banco criado no DirectAdmin
define('DB_USER', 'anarcopu_timeline');     // Usuário do banco
define('DB_PASS', 'SUA_SENHA_AQUI');        // Senha definida no DirectAdmin
define('DB_CHARSET', 'utf8mb4');

$adminSecret = getenv('ADMIN_SECRET');
define('ADMIN_SECRET', is_string($adminSecret) ? $adminSecret : '');

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
