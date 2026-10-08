<?php
// =====================================================================
// ACERVO TIMELINE — API REST PHP para MariaDB 10.4+
// Compatível com Apache / Nginx / DirectAdmin
// =====================================================================

require_once __DIR__ . '/config.php';

if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (strpos($name, 'HTTP_') !== 0) continue;
            $key = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
            $headers[$key] = $value;
        }
        return $headers;
    }
}

// Headers globais de CORS e JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Conexão com MariaDB via PDO
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            ensureCmsSchema($pdo);
            ensurePerfIndexes($pdo);
        } catch (PDOException $e) {
            jsonResponse([
                'error' => 'Falha na conexão com o banco de dados MariaDB',
            ], 500);
        }
    }
    return $pdo;
}

function jsonResponse($data, $status = 200, $extraHeaders = []) {
    http_response_code($status);
    foreach ($extraHeaders as $name => $value) {
        header($name . ': ' . $value);
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function clientIp() {
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($xff !== '') {
        $first = trim(explode(',', $xff)[0]);
        if (filter_var($first, FILTER_VALIDATE_IP)) return $first;
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function prepareViewCounter(PDO $db) {
    static $ready = false;
    if ($ready) return;
    $ready = true;
    $db->exec("CREATE TABLE IF NOT EXISTS document_view_hits (
        document_id VARCHAR(40) NOT NULL,
        visitor_hash CHAR(64) NOT NULL,
        viewed_on DATE NOT NULL,
        PRIMARY KEY (document_id, visitor_hash, viewed_on)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $flag = 'views_zeroed_at';
    $check = $db->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?');
    $check->execute([$flag]);
    if (!$check->fetch()) {
        $db->exec('UPDATE documents SET view_count = 0');
        $db->prepare('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)')->execute([$flag, cmsNow()]);
    }
}

function recordPublicView(PDO $db, $docId, $currentCount) {
    prepareViewCounter($db);
    $currentCount = (int) $currentCount;
    if (tryAuth()) return $currentCount;
    $visitor = hash('sha256', clientIp() . '|' . ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    $insert = $db->prepare('INSERT IGNORE INTO document_view_hits (document_id, visitor_hash, viewed_on) VALUES (?, ?, CURDATE())');
    $insert->execute([$docId, $visitor]);
    if ($insert->rowCount() < 1) return $currentCount;
    $db->prepare('UPDATE documents SET view_count = view_count + 1 WHERE id = ?')->execute([$docId]);
    return $currentCount + 1;
}

function schemaHasIndex(PDO $db, $table, $name) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?");
    $stmt->execute([$table, $name]);
    return (int) $stmt->fetchColumn() > 0;
}

function documentsHasColumn(PDO $db, $column) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'documents' AND column_name = ?");
    $stmt->execute([$column]);
    return (int) $stmt->fetchColumn() > 0;
}

function ensurePerfIndexes(PDO $db) {
    static $done = false;
    if ($done) return;
    $done = true;

    $db->exec("CREATE TABLE IF NOT EXISTS admin_login_attempts (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        attempted_at DATETIME NOT NULL,
        KEY idx_login_ip_time (ip, attempted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    try {
        if (!documentsHasColumn($db, 'doc_year')) {
            $db->exec("ALTER TABLE documents ADD COLUMN doc_year INT GENERATED ALWAYS AS (CAST(LEFT(doc_date, 4) AS UNSIGNED)) STORED");
        }
    } catch (PDOException $e) {
        // MariaDB antigo ou coluna já existente
    }

    $indexes = [
        'idx_docs_public_date' => 'CREATE INDEX idx_docs_public_date ON documents (is_public, deleted_at, doc_date)',
        'idx_docs_year' => 'CREATE INDEX idx_docs_year ON documents (doc_year)',
        'idx_docs_featured' => 'CREATE INDEX idx_docs_featured ON documents (is_featured)',
    ];
    foreach ($indexes as $name => $sql) {
        try {
            if (!schemaHasIndex($db, 'documents', $name)) {
                $db->exec($sql);
            }
        } catch (PDOException $e) {
            // índice opcional
        }
    }

    try {
        if (!schemaHasIndex($db, 'documents', 'ft_docs_search')) {
            $db->exec('ALTER TABLE documents ADD FULLTEXT INDEX ft_docs_search (title, description, author)');
        }
    } catch (PDOException $e) {
        // FULLTEXT indisponível nesta versão
    }
}

function hasFulltextSearch(PDO $db) {
    static $has = null;
    if ($has === null) {
        $has = schemaHasIndex($db, 'documents', 'ft_docs_search');
    }
    return $has;
}

function timelineFilters(PDO $db, $category, $tags, $from, $to, $search) {
    $where = 'WHERE d.is_public = 1 AND d.deleted_at IS NULL';
    $params = [];

    if ($category) {
        $where .= ' AND EXISTS (SELECT 1 FROM document_categories dc JOIN categories c ON dc.category_id = c.id WHERE dc.document_id = d.id AND c.slug = ?)';
        $params[] = $category;
    }
    if ($from) {
        $where .= ' AND d.doc_date >= ?';
        $params[] = $from . '-01-01';
    }
    if ($to) {
        $where .= ' AND d.doc_date <= ?';
        $params[] = $to . '-12-31';
    }
    if ($search) {
        $term = trim((string) $search);
        if (preg_match('/^\d{2,4}$/', $term) && documentsHasColumn($db, 'doc_year')) {
            if (strlen($term) === 4) {
                $where .= ' AND d.doc_year = ?';
                $params[] = (int) $term;
            } else {
                $where .= ' AND CAST(d.doc_year AS CHAR) LIKE ?';
                $params[] = $term . '%';
            }
        } else {
            $like = likeContains($term);
            $where .= " AND (d.title LIKE ? ESCAPE '\\\\' OR d.subtitle LIKE ? ESCAPE '\\\\' OR d.description LIKE ? ESCAPE '\\\\' OR d.author LIKE ? ESCAPE '\\\\')";
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
    }
    if ($tags) {
        $tagList = array_values(array_filter(array_map('trim', explode(',', (string) $tags))));
        if ($tagList) {
            $inClause = implode(',', array_fill(0, count($tagList), '?'));
            $where .= " AND EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON dt.tag_id = t.id WHERE dt.document_id = d.id AND t.slug IN ($inClause))";
            foreach ($tagList as $tg) {
                $params[] = $tg;
            }
        }
    }

    return [$where, $params];
}

function mapTimelineCard($row) {
    $catSlugs = $row['category_slugs'] ? explode(',', $row['category_slugs']) : [];
    $catNames = $row['category_names'] ? explode(',', $row['category_names']) : [];
    $catColors = $row['category_colors'] ? explode(',', $row['category_colors']) : [];
    $cats = [];
    foreach ($catSlugs as $i => $slug) {
        $cats[] = [
            'slug' => $slug,
            'name' => $catNames[$i] ?? $slug,
            'color' => $catColors[$i] ?? '#6366f1',
        ];
    }
    return [
        'id' => $row['id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'subtitle' => $row['subtitle'],
        'doc_date' => $row['doc_date'],
        'date_precision' => $row['date_precision'],
        'doc_type' => $row['doc_type'],
        'source_url' => $row['source_url'] ?? null,
        'author' => $row['author'],
        'location' => $row['location'],
        'is_public' => true,
        'is_featured' => (bool) $row['is_featured'],
        'view_count' => (int) $row['view_count'],
        'thumbnail_url' => resolveMediaUrl($row['thumbnail_key']),
        'categories' => $cats,
        'tags' => $row['tag_names'] ? explode(',', $row['tag_names']) : [],
    ];
}

function timelineCardSql($where) {
    return "
      SELECT
        d.id, d.slug, d.title, d.subtitle, d.doc_date, d.date_precision,
        d.doc_type, d.thumbnail_key, d.author, d.location,
        d.source_url, d.is_featured, d.view_count,
        GROUP_CONCAT(DISTINCT c.slug) as category_slugs,
        GROUP_CONCAT(DISTINCT c.name) as category_names,
        GROUP_CONCAT(DISTINCT c.color) as category_colors,
        GROUP_CONCAT(DISTINCT t.name) as tag_names
      FROM documents d
      LEFT JOIN document_categories dc ON d.id = dc.document_id
      LEFT JOIN categories c ON dc.category_id = c.id
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      {$where}
      GROUP BY d.id
      ORDER BY d.doc_date ASC, d.id ASC
    ";
}

function loadPeriodBackgrounds(PDO $db) {
    $bgStmt = $db->query('SELECT * FROM period_backgrounds ORDER BY year_start ASC');
    $periodBackgrounds = [];
    foreach ($bgStmt->fetchAll() as $bg) {
        $periodBackgrounds[] = [
            'id' => $bg['id'],
            'year_start' => (int) $bg['year_start'],
            'year_end' => (int) $bg['year_end'],
            'image_url' => resolveMediaUrl($bg['image_key']),
            'description' => $bg['description'],
            'opacity' => (float) $bg['opacity'],
        ];
    }
    return $periodBackgrounds;
}

function fetchTimelineCards(PDO $db, $where, $params, $limit = null, $offset = null) {
    $sql = timelineCardSql($where);
    if ($limit !== null) {
        $sql .= ' LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;
    }
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $items[] = mapTimelineCard($row);
    }
    return $items;
}

function saveDocumentMedia(PDO $db, $docId, $items) {
    $db->prepare('DELETE FROM document_media WHERE document_id = ?')->execute([$docId]);
    if (!is_array($items)) return;
    $insert = $db->prepare('INSERT INTO document_media (id, document_id, file_key, media_type, caption, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    $order = 0;
    foreach ($items as $item) {
        if (!is_array($item)) continue;
        $key = trim((string) ($item['file_key'] ?? $item['url'] ?? ''));
        if ($key === '') continue;
        $type = preg_replace('/[^a-z_]/', '', (string) ($item['media_type'] ?? 'image')) ?: 'image';
        $insert->execute([
            'media_' . bin2hex(random_bytes(6)),
            $docId,
            $key,
            $type,
            isset($item['caption']) ? (string) $item['caption'] : null,
            $order,
        ]);
        $order++;
    }
}

function likeContains($term) {
    $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], (string) $term);
    return '%' . $escaped . '%';
}

function requireAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = trim(preg_replace('/^Bearer\s+/i', '', $authHeader));

    if (ADMIN_SECRET === '') {
        jsonResponse(['error' => 'O painel administrativo não está disponível.'], 503);
    }
    if (!$token || !hash_equals(ADMIN_SECRET, $token)) {
        jsonResponse(['error' => 'Autorização necessária ou token inválido.'], 401);
    }
}

function getUploadsBaseUrl() {
    if (defined('UPLOADS_BASE_URL') && !empty(UPLOADS_BASE_URL)) {
        return rtrim(UPLOADS_BASE_URL, '/');
    }
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    return $protocol . $host . $dir . '/uploads';
}

function resolveMediaUrl($key) {
    if (!$key) return null;
    if (strpos($key, 'http://') === 0 || strpos($key, 'https://') === 0) {
        return $key;
    }
    return getUploadsBaseUrl() . '/' . ltrim($key, '/');
}

function cmsNow() {
    return date('Y-m-d H:i:s');
}

function ensureCmsSchema(PDO $db) {
    $db->exec("CREATE TABLE IF NOT EXISTS site_pages (
        id VARCHAR(40) PRIMARY KEY,
        slug VARCHAR(180) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        body MEDIUMTEXT NULL,
        is_visible TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $db->exec("CREATE TABLE IF NOT EXISTS site_settings (
        setting_key VARCHAR(64) PRIMARY KEY,
        setting_value TEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pageCount = (int) $db->query('SELECT COUNT(*) FROM site_pages')->fetchColumn();
    if ($pageCount === 0) {
        $now = cmsNow();
        $mission = '<p>O Acervo Timeline reúne, descreve e disponibiliza registros históricos, artísticos e documentais para consulta pública, com ênfase em preservação da memória e leitura crítica das fontes.</p><h3>Metodologia</h3><p>Cada item é catalogado com data, autoria, suporte e contexto. A linha do tempo organiza o acervo por período, sem substituir a ficha completa do documento.</p>';
        $catalog = '<p>O catálogo público reúne as obras e documentos disponíveis para navegação na linha do tempo e na listagem do acervo. A consulta é aberta; a edição permanece restrita à administração.</p>';
        $seed = $db->prepare('INSERT INTO site_pages (id, slug, title, body, is_visible, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?)');
        $seed->execute(['page_missao', 'missao-metodologia', 'Missão & Metodologia', $mission, 10, $now, $now]);
        $seed->execute(['page_catalogo', 'catalogo-publico', 'Catálogo público', $catalog, 20, $now, $now]);
    }

    $setCount = (int) $db->query('SELECT COUNT(*) FROM site_settings')->fetchColumn();
    if ($setCount === 0) {
        $defaults = [
            'site_title' => 'Acervo Timeline',
            'site_subtitle' => 'Preservação da Memória & História',
            'logo_url' => '',
            'logo_invert' => '1',
            'footer_about' => 'Arquivo digital aberto dedicado à documentação, catalogação crítica e conservação preventiva do patrimônio histórico, artístico e cultural.',
            'footer_copyright' => 'Acervo Timeline & Preservação da Memória.',
            'footer_credit' => 'Acesso público para pesquisa e patrimônio cultural.',
            'footer_nav_label' => 'Navegação',
            'footer_institutional_label' => 'Institucional',
            'footer_image_url' => '/footer-band.webp',
            'hero_images' => '[]',
            'hero_interval' => '8',
            'hero_kenburns' => '0',
            'home_badge' => 'Arquivo Aberto',
            'home_eyebrow' => 'Catálogo crítico de obras',
            'home_title' => 'Explore por período e movimento',
            'home_lead' => 'Marcos, iconografias fundadoras e documentos raros do patrimônio visual e político, estruturados em linha contínua do tempo.',
            'home_search_placeholder' => 'Buscar por título, autor ou ano...',
            'explore_badge' => 'Catálogo',
            'explore_title' => 'Explorar acervo histórico',
            'explore_lead' => 'Pesquise registros, documentos oficiais, imagens e mídias digitalizadas.',
            'explore_search_placeholder' => 'Buscar por palavras-chave, eventos ou personalidades...',
        ];
        $insert = $db->prepare('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?)');
        foreach ($defaults as $key => $value) {
            $insert->execute([$key, $value]);
        }
    }

    $copyDefaults = [
        'home_badge' => 'Arquivo Aberto',
        'home_eyebrow' => 'Catálogo crítico de obras',
        'home_title' => 'Explore por período e movimento',
        'home_lead' => 'Marcos, iconografias fundadoras e documentos raros do patrimônio visual e político, estruturados em linha contínua do tempo.',
        'home_search_placeholder' => 'Buscar por título, autor ou ano...',
        'explore_badge' => 'Catálogo',
        'explore_title' => 'Explorar acervo histórico',
        'explore_lead' => 'Pesquise registros, documentos oficiais, imagens e mídias digitalizadas.',
        'explore_search_placeholder' => 'Buscar por palavras-chave, eventos ou personalidades...',
        'footer_image_url' => '/footer-band.webp',
        'hero_images' => '[]',
        'hero_interval' => '8',
        'hero_kenburns' => '0',
    ];
    $ensureSetting = $db->prepare('INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)');
    foreach ($copyDefaults as $key => $value) {
        $ensureSetting->execute([$key, $value]);
    }
}

function loadSiteSettings(PDO $db) {
    ensureCmsSchema($db);
    $rows = $db->query('SELECT setting_key, setting_value FROM site_settings')->fetchAll();
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    return $settings;
}

function mapSitePage($row, $withBody = true) {
    $page = [
        'id' => $row['id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'is_visible' => (bool) $row['is_visible'],
        'sort_order' => (int) $row['sort_order'],
        'updated_at' => $row['updated_at'] ?? null,
    ];
    if ($withBody) {
        $page['body'] = $row['body'] ?? '';
    }
    return $page;
}

function tryAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = trim(preg_replace('/^Bearer\s+/i', '', $authHeader));
    return ADMIN_SECRET !== '' && $token && hash_equals(ADMIN_SECRET, $token);
}

function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    return strtolower($text ?: 'doc-' . bin2hex(random_bytes(4)));
}

// Roteador simples
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptDir = dirname($_SERVER['SCRIPT_NAME']);
$path = substr($requestUri, strlen($scriptDir));
$path = '/' . trim($path, '/');
// Remove prefixo /api se houver
if (strpos($path, '/api') === 0) {
    $path = substr($path, 4);
    $path = '/' . trim($path, '/');
}

$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

// =====================================================================
// ROTAS
// =====================================================================

// 1. Health Check
if ($path === '' || $path === '/' || $path === '/health') {
    jsonResponse(['ok' => true, 'timestamp' => time(), 'service' => 'acervo-timeline-mariadb']);
}

// 2. Timeline
if ($path === '/timeline' && $method === 'GET') {
    $db = getDB();
    $category = $_GET['category'] ?? null;
    $tags = $_GET['tags'] ?? null;
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;
    $search = $_GET['search'] ?? null;
    $mode = $_GET['mode'] ?? '';
    $aroundYear = isset($_GET['around_year']) ? (int) $_GET['around_year'] : 0;
    $hasWindow = array_key_exists('offset', $_GET) || array_key_exists('limit', $_GET) || $aroundYear > 0;
    $limit = min(40, max(1, (int) ($_GET['limit'] ?? 28)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));
    $cacheHeaders = [
        'Cache-Control' => 'public, max-age=45',
        'Vary' => 'Accept-Encoding',
    ];

    [$where, $params] = timelineFilters($db, $category, $tags, $from, $to, $search);

    $countStmt = $db->prepare("SELECT COUNT(*) FROM documents d {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    if ($mode === 'index') {
        $idxStmt = $db->prepare("SELECT d.id, d.slug, d.doc_date, d.is_featured FROM documents d {$where} ORDER BY d.doc_date ASC, d.id ASC");
        $idxStmt->execute($params);
        $index = [];
        foreach ($idxStmt->fetchAll() as $row) {
            $index[] = [
                'id' => $row['id'],
                'slug' => $row['slug'],
                'doc_date' => $row['doc_date'],
                'is_featured' => (bool) $row['is_featured'],
            ];
        }

        $featWhere = $where . ' AND d.is_featured = 1';
        $featured = fetchTimelineCards($db, $featWhere, $params, 3, 0);

        jsonResponse([
            'index' => $index,
            'items' => [],
            'featured' => $featured,
            'total' => $total,
            'period_backgrounds' => loadPeriodBackgrounds($db),
            'generated_at' => time() * 1000,
        ], 200, $cacheHeaders);
    }

    if ($aroundYear > 0) {
        $beforeSql = "SELECT COUNT(*) FROM documents d {$where} AND d.doc_date < ?";
        $beforeStmt = $db->prepare($beforeSql);
        $beforeStmt->execute(array_merge($params, [sprintf('%04d-01-01', $aroundYear)]));
        $before = (int) $beforeStmt->fetchColumn();
        $offset = max(0, $before - intdiv($limit, 2));
    }

    if ($hasWindow) {
        if ($offset > $total) $offset = $total;
        $items = fetchTimelineCards($db, $where, $params, $limit, $offset);
        jsonResponse([
            'items' => $items,
            'total' => $total,
            'offset' => $offset,
            'limit' => $limit,
            'generated_at' => time() * 1000,
        ], 200, $cacheHeaders);
    }

    $items = fetchTimelineCards($db, $where, $params);
    jsonResponse([
        'items' => $items,
        'total' => $total,
        'period_backgrounds' => loadPeriodBackgrounds($db),
        'generated_at' => time() * 1000,
    ], 200, $cacheHeaders);
}

// 3. Documentos (Lista Paginada e Detalhes)
if ($path === '/docs' && $method === 'GET') {
    $db = getDB();
    $includeAll = isset($_GET['all']) && $_GET['all'] === '1';
    if ($includeAll) requireAuth();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $search = $_GET['search'] ?? null;
    $category = $_GET['category'] ?? null;
    $tag = $_GET['tag'] ?? null;
    $docType = $_GET['type'] ?? null;

    $where = $includeAll
        ? "WHERE d.deleted_at IS NULL"
        : "WHERE d.is_public = 1 AND d.deleted_at IS NULL";
    $params = [];

    if ($search) {
        $termRaw = trim((string) $search);
        if (preg_match('/^\d{2,4}$/', $termRaw) && documentsHasColumn($db, 'doc_year')) {
            if (strlen($termRaw) === 4) {
                $where .= " AND d.doc_year = ?";
                $params[] = (int) $termRaw;
            } else {
                $where .= " AND CAST(d.doc_year AS CHAR) LIKE ?";
                $params[] = $termRaw . '%';
            }
        } else {
            $term = likeContains($termRaw);
            $where .= " AND (d.title LIKE ? ESCAPE '\\\\' OR d.subtitle LIKE ? ESCAPE '\\\\' OR d.description LIKE ? ESCAPE '\\\\' OR d.author LIKE ? ESCAPE '\\\\')";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }
    }
    if ($category) {
        $where .= " AND EXISTS (SELECT 1 FROM document_categories dc JOIN categories c ON dc.category_id = c.id WHERE dc.document_id = d.id AND c.slug = ?)";
        $params[] = $category;
    }
    if ($tag) {
        $where .= " AND EXISTS (SELECT 1 FROM document_tags dt JOIN tags t ON dt.tag_id = t.id WHERE dt.document_id = d.id AND t.slug = ?)";
        $params[] = $tag;
    }
    if ($docType) {
        $where .= " AND d.doc_type = ?";
        $params[] = $docType;
    }

    // Contagem total
    $countStmt = $db->prepare("SELECT COUNT(DISTINCT d.id) as total FROM documents d {$where}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];

    $sql = "
      SELECT 
        d.id, d.slug, d.title, d.subtitle, d.description, d.doc_date, d.date_precision,
        d.doc_type, d.source_url, d.file_key, d.thumbnail_key, d.cover_image_key, d.author, d.publisher, d.location,
        d.is_featured, d.is_public, d.view_count, d.created_at,
        GROUP_CONCAT(DISTINCT c.name) as category_names,
        GROUP_CONCAT(DISTINCT c.slug) as category_slugs,
        GROUP_CONCAT(DISTINCT c.color) as category_colors,
        GROUP_CONCAT(DISTINCT t.name) as tag_names
      FROM documents d
      LEFT JOIN document_categories dc ON d.id = dc.document_id
      LEFT JOIN categories c ON dc.category_id = c.id
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      {$where}
      GROUP BY d.id
      ORDER BY d.doc_date DESC
      LIMIT ? OFFSET ?
    ";
    $listParams = array_merge($params, [$limit, $offset]);
    $stmt = $db->prepare($sql);
    $stmt->execute($listParams);
    $rows = $stmt->fetchAll();

    $items = [];
    foreach ($rows as $row) {
        $catSlugs = $row['category_slugs'] ? explode(',', $row['category_slugs']) : [];
        $catNames = $row['category_names'] ? explode(',', $row['category_names']) : [];
        $catColors = $row['category_colors'] ? explode(',', $row['category_colors']) : [];
        $cats = [];
        foreach ($catSlugs as $i => $slug) {
            $cats[] = [
                'slug' => $slug,
                'name' => $catNames[$i] ?? $slug,
                'color' => $catColors[$i] ?? '#6366f1'
            ];
        }

        $items[] = [
            'id' => $row['id'],
            'slug' => $row['slug'],
            'title' => $row['title'],
            'subtitle' => $row['subtitle'],
            'description' => $row['description'],
            'doc_date' => $row['doc_date'],
            'date_precision' => $row['date_precision'],
            'doc_type' => $row['doc_type'],
            'source_url' => $row['source_url'],
            'file_key' => $row['file_key'],
            'thumbnail_key' => $row['thumbnail_key'],
            'author' => $row['author'],
            'publisher' => $row['publisher'],
            'location' => $row['location'],
            'is_featured' => (bool)$row['is_featured'],
            'is_public' => (bool) ($row['is_public'] ?? 1),
            'view_count' => (int)$row['view_count'],
            'thumbnail_url' => resolveMediaUrl($row['thumbnail_key']),
            'cover_image_url' => resolveMediaUrl($row['cover_image_key']),
            'categories' => $cats,
            'tags' => $row['tag_names'] ? explode(',', $row['tag_names']) : [],
        ];
    }

    jsonResponse([
        'items' => $items,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'total_pages' => ceil($total / $limit)
    ]);
}

function ogPlainText($value) {
    $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $value)));
    if ($text === '') return '';
    if (function_exists('mb_strlen') && mb_strlen($text) > 220) {
        return rtrim(mb_substr($text, 0, 217)) . '...';
    }
    if (strlen($text) > 220) {
        return rtrim(substr($text, 0, 217)) . '...';
    }
    return $text;
}

// Prévia para WhatsApp e outras redes: GET /og/{slug}
// Não conta visualização. O HTML público da ficha usa estes dados.
if (preg_match('#^/og/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET') {
    $db = getDB();
    $stmt = $db->prepare('SELECT title, subtitle, description, thumbnail_key, cover_image_key, is_public FROM documents WHERE slug = ? AND deleted_at IS NULL');
    $stmt->execute([$matches[1]]);
    $doc = $stmt->fetch();
    if (!$doc || !(int) $doc['is_public']) {
        jsonResponse(['error' => 'Documento não encontrado'], 404);
    }
    $description = ogPlainText($doc['description']);
    if ($description === '') $description = ogPlainText($doc['subtitle']);
    jsonResponse([
        'title' => $doc['title'],
        'description' => $description,
        'image' => resolveMediaUrl($doc['cover_image_key'] ?: $doc['thumbnail_key']),
    ], 200, ['Cache-Control' => 'public, max-age=300']);
}

// 4. Detalhes de Documento por Slug: GET /docs/{slug}
if (preg_match('#^/docs/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET') {
    $db = getDB();
    prepareViewCounter($db);
    $slug = $matches[1];

    $stmt = $db->prepare("SELECT * FROM documents WHERE slug = ? AND deleted_at IS NULL");
    $stmt->execute([$slug]);
    $doc = $stmt->fetch();

    if (!$doc) {
        jsonResponse(['error' => 'Documento não encontrado'], 404);
    }
    if (!(int) $doc['is_public'] && !tryAuth()) {
        jsonResponse(['error' => 'Documento não encontrado'], 404);
    }

    $doc['view_count'] = recordPublicView($db, $doc['id'], $doc['view_count']);

    // Categorias
    $catStmt = $db->prepare("
      SELECT c.* FROM categories c
      JOIN document_categories dc ON c.id = dc.category_id
      WHERE dc.document_id = ?
    ");
    $catStmt->execute([$doc['id']]);
    $categories = $catStmt->fetchAll();

    // Tags
    $tagStmt = $db->prepare("
      SELECT t.* FROM tags t
      JOIN document_tags dt ON t.id = dt.tag_id
      WHERE dt.document_id = ?
    ");
    $tagStmt->execute([$doc['id']]);
    $tags = $tagStmt->fetchAll();

    // Mídias
    $mediaStmt = $db->prepare("SELECT * FROM document_media WHERE document_id = ? ORDER BY sort_order ASC");
    $mediaStmt->execute([$doc['id']]);
    $mediaRows = $mediaStmt->fetchAll();
    $media = [];
    foreach ($mediaRows as $m) {
        $media[] = [
            'id' => $m['id'],
            'media_type' => $m['media_type'],
            'caption' => $m['caption'],
            'file_key' => $m['file_key'],
            'url' => resolveMediaUrl($m['file_key']),
        ];
    }

    // Documentos relacionados (mesma categoria ou anos próximos)
    $relStmt = $db->prepare("
      SELECT d.id, d.slug, d.title, d.thumbnail_key, d.doc_date, d.doc_type
      FROM documents d
      WHERE d.id != ? AND d.is_public = 1 AND d.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1 FROM document_categories dc
            WHERE dc.document_id = d.id
              AND dc.category_id IN (SELECT category_id FROM document_categories WHERE document_id = ?)
          )
          OR ABS(CAST(LEFT(d.doc_date, 4) AS SIGNED) - CAST(LEFT(?, 4) AS SIGNED)) <= 15
        )
      ORDER BY
        (EXISTS (
          SELECT 1 FROM document_categories dc
          WHERE dc.document_id = d.id
            AND dc.category_id IN (SELECT category_id FROM document_categories WHERE document_id = ?)
        )) DESC,
        ABS(CAST(LEFT(d.doc_date, 4) AS SIGNED) - CAST(LEFT(?, 4) AS SIGNED)) ASC
      LIMIT 4
    ");
    $relStmt->execute([$doc['id'], $doc['id'], $doc['doc_date'], $doc['id'], $doc['doc_date']]);
    $relRows = $relStmt->fetchAll();
    $related = [];
    foreach ($relRows as $r) {
        $related[] = [
            'id' => $r['id'],
            'slug' => $r['slug'],
            'title' => $r['title'],
            'doc_date' => $r['doc_date'],
            'doc_type' => $r['doc_type'],
            'thumbnail_url' => resolveMediaUrl($r['thumbnail_key']),
        ];
    }

    jsonResponse([
        'id' => $doc['id'],
        'slug' => $doc['slug'],
        'title' => $doc['title'],
        'subtitle' => $doc['subtitle'],
        'description' => $doc['description'],
        'body' => $doc['body'],
        'doc_date' => $doc['doc_date'],
        'date_precision' => $doc['date_precision'],
        'doc_type' => $doc['doc_type'],
        'source_url' => $doc['source_url'],
        'file_key' => $doc['file_key'],
        'thumbnail_key' => $doc['thumbnail_key'],
        'author' => $doc['author'],
        'publisher' => $doc['publisher'],
        'location' => $doc['location'],
        'language' => $doc['language'],
        'is_public' => (bool)$doc['is_public'],
        'is_featured' => (bool)$doc['is_featured'],
        'view_count' => (int)$doc['view_count'],
        'thumbnail_url' => resolveMediaUrl($doc['thumbnail_key']),
        'cover_image_url' => resolveMediaUrl($doc['cover_image_key']),
        'file_url' => resolveMediaUrl($doc['file_key']),
        'categories' => $categories,
        'tags' => $tags,
        'media' => $media,
        'related' => $related,
    ]);
}

// 5. Cadastrar Documento: POST /docs
if ($path === '/docs' && $method === 'POST') {
    requireAuth();
    $db = getDB();

    $title = trim($body['title'] ?? '');
    if (!$title) jsonResponse(['error' => 'Título é obrigatório'], 400);

    $id = 'doc_' . bin2hex(random_bytes(8));
    $slug = !empty($body['slug']) ? slugify($body['slug']) : slugify($title) . '-' . substr($id, 4, 4);

    // Evita colisão
    $check = $db->prepare("SELECT id FROM documents WHERE slug = ?");
    $check->execute([$slug]);
    if ($check->fetch()) {
        $slug .= '-' . bin2hex(random_bytes(2));
    }

    $stmt = $db->prepare("
      INSERT INTO documents (
        id, slug, title, subtitle, description, body, doc_date, date_precision,
        doc_type, source_url, file_key, thumbnail_key, cover_image_key,
        author, publisher, location, language, is_public, is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $id, $slug, $title,
        $body['subtitle'] ?? null,
        $body['description'] ?? null,
        $body['body'] ?? null,
        $body['doc_date'] ?? date('Y-m-d'),
        $body['date_precision'] ?? 'day',
        $body['doc_type'] ?? 'document',
        $body['source_url'] ?? null,
        $body['file_key'] ?? null,
        $body['thumbnail_key'] ?? null,
        $body['cover_image_key'] ?? null,
        $body['author'] ?? null,
        $body['publisher'] ?? null,
        $body['location'] ?? null,
        $body['language'] ?? 'pt-BR',
        isset($body['is_public']) ? (int)$body['is_public'] : 1,
        isset($body['is_featured']) ? (int)$body['is_featured'] : 0,
    ]);

    if (!empty($body['categories']) && is_array($body['categories'])) {
        $catInsert = $db->prepare("INSERT IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)");
        foreach ($body['categories'] as $catId) {
            $catInsert->execute([$id, $catId]);
        }
    }

    if (array_key_exists('media', $body)) {
        saveDocumentMedia($db, $id, $body['media']);
    }

    jsonResponse(['ok' => true, 'id' => $id, 'slug' => $slug], 201);
}

// 6. Atualizar Documento: PUT /docs/{id}
if (preg_match('#^/docs/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'PUT') {
    requireAuth();
    $db = getDB();
    $id = $matches[1];

    $check = $db->prepare("SELECT id FROM documents WHERE id = ? AND deleted_at IS NULL");
    $check->execute([$id]);
    if (!$check->fetch()) {
        jsonResponse(['error' => 'Documento não encontrado'], 404);
    }

    $stmt = $db->prepare("
      UPDATE documents SET
        title = COALESCE(?, title),
        subtitle = COALESCE(?, subtitle),
        description = COALESCE(?, description),
        body = COALESCE(?, body),
        doc_date = COALESCE(?, doc_date),
        date_precision = COALESCE(?, date_precision),
        doc_type = COALESCE(?, doc_type),
        source_url = COALESCE(?, source_url),
        file_key = COALESCE(?, file_key),
        thumbnail_key = COALESCE(?, thumbnail_key),
        cover_image_key = COALESCE(?, cover_image_key),
        author = COALESCE(?, author),
        publisher = COALESCE(?, publisher),
        location = COALESCE(?, location),
        is_public = COALESCE(?, is_public),
        is_featured = COALESCE(?, is_featured)
      WHERE id = ?
    ");
    $stmt->execute([
        $body['title'] ?? null,
        $body['subtitle'] ?? null,
        $body['description'] ?? null,
        $body['body'] ?? null,
        $body['doc_date'] ?? null,
        $body['date_precision'] ?? null,
        $body['doc_type'] ?? null,
        $body['source_url'] ?? null,
        $body['file_key'] ?? null,
        $body['thumbnail_key'] ?? null,
        $body['cover_image_key'] ?? null,
        $body['author'] ?? null,
        $body['publisher'] ?? null,
        $body['location'] ?? null,
        isset($body['is_public']) ? (int)$body['is_public'] : null,
        isset($body['is_featured']) ? (int)$body['is_featured'] : null,
        $id
    ]);

    if (isset($body['categories']) && is_array($body['categories'])) {
        $db->prepare("DELETE FROM document_categories WHERE document_id = ?")->execute([$id]);
        $catInsert = $db->prepare("INSERT IGNORE INTO document_categories (document_id, category_id) VALUES (?, ?)");
        foreach ($body['categories'] as $catId) {
            $catInsert->execute([$id, $catId]);
        }
    }

    if (array_key_exists('media', $body)) {
        saveDocumentMedia($db, $id, $body['media']);
    }

    jsonResponse(['ok' => true, 'message' => 'Documento atualizado com sucesso']);
}

// 7. Soft Delete Documento: DELETE /docs/{id}
if (preg_match('#^/docs/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'DELETE') {
    requireAuth();
    $db = getDB();
    $id = $matches[1];

    $stmt = $db->prepare("UPDATE documents SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'Documento não encontrado ou já removido'], 404);
    }
    jsonResponse(['ok' => true, 'message' => 'Documento removido com sucesso']);
}

// 8. Categorias e Tags: GET /categories
if ($path === '/categories' && $method === 'GET') {
    $db = getDB();
    $catRows = $db->query("
      SELECT c.*, COUNT(dc.document_id) as doc_count
      FROM categories c
      LEFT JOIN document_categories dc ON c.id = dc.category_id
      LEFT JOIN documents d ON dc.document_id = d.id AND d.is_public = 1 AND d.deleted_at IS NULL
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    ")->fetchAll();

    $tagRows = $db->query("
      SELECT t.*, COUNT(dt.document_id) as doc_count
      FROM tags t
      LEFT JOIN document_tags dt ON t.id = dt.tag_id
      LEFT JOIN documents d ON dt.document_id = d.id AND d.is_public = 1 AND d.deleted_at IS NULL
      GROUP BY t.id
      ORDER BY t.name ASC
    ")->fetchAll();

    jsonResponse([
        'categories' => $catRows,
        'tags' => $tagRows,
    ]);
}

// 9. Criar Categoria: POST /categories
if ($path === '/categories' && $method === 'POST') {
    requireAuth();
    $db = getDB();

    $name = trim($body['name'] ?? '');
    if (!$name) jsonResponse(['error' => 'Nome da categoria é obrigatório'], 400);

    $id = 'cat_' . bin2hex(random_bytes(4));
    $slug = !empty($body['slug']) ? slugify($body['slug']) : slugify($name);

    $stmt = $db->prepare("
      INSERT INTO categories (id, name, slug, description, color, icon, parent_id, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $id, $name, $slug,
        $body['description'] ?? null,
        $body['color'] ?? '#6366f1',
        $body['icon'] ?? null,
        $body['parent_id'] ?? null,
        $body['sort_order'] ?? 0
    ]);

    jsonResponse(['ok' => true, 'id' => $id, 'slug' => $slug], 201);
}

// 10. Criar Tag: POST /categories/tags
if ($path === '/categories/tags' && $method === 'POST') {
    requireAuth();
    $db = getDB();

    $name = trim($body['name'] ?? '');
    if (!$name) jsonResponse(['error' => 'Nome da tag é obrigatório'], 400);

    $id = 'tag_' . bin2hex(random_bytes(4));
    $slug = !empty($body['slug']) ? slugify($body['slug']) : slugify($name);

    $stmt = $db->prepare("INSERT INTO tags (id, name, slug, color) VALUES (?, ?, ?, ?)");
    $stmt->execute([$id, $name, $slug, $body['color'] ?? '#94a3b8']);

    jsonResponse(['ok' => true, 'id' => $id, 'slug' => $slug], 201);
}

// 11. Upload de Arquivo: POST /upload
if ($path === '/upload' && $method === 'POST') {
    requireAuth();

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        jsonResponse(['error' => 'Nenhum arquivo enviado ou erro no upload'], 400);
    }

    $file = $_FILES['file'];

    // Validação de Tamanho
    if ($file['size'] > MAX_FILE_SIZE) {
        jsonResponse(['error' => 'Arquivo excede o limite máximo permitido de 100MB'], 400);
    }

    // Validação rigorosa de MIME Type
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    if (!in_array($mimeType, ALLOWED_MIME_TYPES)) {
        jsonResponse([
            'error' => 'Tipo de arquivo não permitido',
            'allowed_types' => ALLOWED_MIME_TYPES
        ], 415);
    }

    // Diretório de uploads
    if (!is_dir(UPLOADS_DIR)) {
        mkdir(UPLOADS_DIR, 0755, true);
    }

    $mimeExt = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'application/pdf' => 'pdf',
        'text/plain' => 'txt',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'audio/mpeg' => 'mp3',
        'audio/ogg' => 'ogg',
    ];
    $ext = $mimeExt[$mimeType] ?? 'bin';
    $uniqueName = bin2hex(random_bytes(16)) . '.' . $ext;
    $targetPath = UPLOADS_DIR . '/' . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        jsonResponse(['error' => 'Falha ao salvar arquivo no disco do servidor'], 500);
    }

    $publicUrl = getUploadsBaseUrl() . '/' . $uniqueName;

    jsonResponse([
        'ok' => true,
        'file_key' => $uniqueName,
        'public_url' => $publicUrl,
        'filename' => $file['name'],
        'size' => $file['size'],
        'mime_type' => $mimeType
    ], 201);
}

// 12. Autenticação Admin: POST /admin/verify
if ($path === '/admin/verify' && $method === 'POST') {
    if (ADMIN_SECRET === '') {
        jsonResponse(['error' => 'O painel administrativo não está disponível.'], 503);
    }
    $db = getDB();
    $ip = clientIp();
    $db->prepare('DELETE FROM admin_login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 1 DAY)')->execute();
    $countStmt = $db->prepare('SELECT COUNT(*) FROM admin_login_attempts WHERE ip = ? AND attempted_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)');
    $countStmt->execute([$ip]);
    if ((int) $countStmt->fetchColumn() >= 5) {
        jsonResponse(['error' => 'Muitas tentativas. Aguarde alguns minutos.'], 429);
    }

    $secret = isset($body['secret']) && is_string($body['secret']) ? $body['secret'] : '';
    $honeypot = isset($body['website']) && is_string($body['website']) ? trim($body['website']) : '';
    if ($honeypot !== '' || !hash_equals(ADMIN_SECRET, $secret)) {
        $db->prepare('INSERT INTO admin_login_attempts (ip, attempted_at) VALUES (?, NOW())')->execute([$ip]);
        jsonResponse(['error' => 'Chave de administração inválida'], 401);
    }
    $db->prepare('DELETE FROM admin_login_attempts WHERE ip = ?')->execute([$ip]);
    jsonResponse(['ok' => true, 'valid' => true]);
}

// 13. Estatísticas Admin: GET /admin/stats
if ($path === '/admin/stats' && $method === 'GET') {
    requireAuth();
    $db = getDB();
    prepareViewCounter($db);

    $docCount = $db->query("SELECT COUNT(*) as cnt FROM documents WHERE deleted_at IS NULL")->fetch()['cnt'];
    $viewCount = $db->query("SELECT COALESCE(SUM(view_count), 0) as cnt FROM documents WHERE deleted_at IS NULL")->fetch()['cnt'];
    $catCount = $db->query("SELECT COUNT(*) as cnt FROM categories")->fetch()['cnt'];
    $tagCount = $db->query("SELECT COUNT(*) as cnt FROM tags")->fetch()['cnt'];

    $recentStmt = $db->query("
      SELECT id, slug, title, doc_date, doc_type, is_public, view_count, created_at
      FROM documents
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    ");
    $recentDocs = $recentStmt->fetchAll();

    jsonResponse([
        'total_documents' => (int)$docCount,
        'total_views' => (int)$viewCount,
        'total_categories' => (int)$catCount,
        'total_tags' => (int)$tagCount,
        'recent_documents' => $recentDocs,
    ]);
}

// 14. Páginas institucionais e identidade do site
if ($path === '/pages' && $method === 'GET') {
    $db = getDB();
    $admin = isset($_GET['all']) && $_GET['all'] === '1';
    if ($admin) requireAuth();
    $sql = $admin
        ? 'SELECT * FROM site_pages ORDER BY sort_order ASC, title ASC'
        : 'SELECT * FROM site_pages WHERE is_visible = 1 ORDER BY sort_order ASC, title ASC';
    $rows = $db->query($sql)->fetchAll();
    $items = [];
    foreach ($rows as $row) {
        $items[] = mapSitePage($row, $admin);
    }
    jsonResponse(['items' => $items]);
}

if ($path === '/pages' && $method === 'POST') {
    requireAuth();
    $db = getDB();
    $title = trim((string) ($body['title'] ?? ''));
    if ($title === '') jsonResponse(['error' => 'Informe o título da página.'], 400);
    $slug = slugify((string) ($body['slug'] ?? $title));
    $check = $db->prepare('SELECT id FROM site_pages WHERE slug = ?');
    $check->execute([$slug]);
    if ($check->fetch()) {
        $slug .= '-' . bin2hex(random_bytes(2));
    }
    $id = 'page_' . bin2hex(random_bytes(8));
    $now = cmsNow();
    $visible = !empty($body['is_visible']) ? 1 : 0;
    $order = isset($body['sort_order']) ? (int) $body['sort_order'] : 100;
    $stmt = $db->prepare('INSERT INTO site_pages (id, slug, title, body, is_visible, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$id, $slug, $title, (string) ($body['body'] ?? ''), $visible, $order, $now, $now]);
    jsonResponse(['ok' => true, 'id' => $id, 'slug' => $slug], 201);
}

if (preg_match('#^/pages/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET') {
    $db = getDB();
    $key = $matches[1];
    $stmt = $db->prepare('SELECT * FROM site_pages WHERE slug = ? OR id = ? LIMIT 1');
    $stmt->execute([$key, $key]);
    $row = $stmt->fetch();
    if (!$row) jsonResponse(['error' => 'Página não encontrada'], 404);
    if (!(int) $row['is_visible'] && !tryAuth()) jsonResponse(['error' => 'Página não encontrada'], 404);
    jsonResponse(mapSitePage($row, true));
}

if (preg_match('#^/pages/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'PUT') {
    requireAuth();
    $db = getDB();
    $id = $matches[1];
    $stmt = $db->prepare('SELECT * FROM site_pages WHERE id = ? OR slug = ? LIMIT 1');
    $stmt->execute([$id, $id]);
    $row = $stmt->fetch();
    if (!$row) jsonResponse(['error' => 'Página não encontrada'], 404);
    $title = array_key_exists('title', $body) ? trim((string) $body['title']) : $row['title'];
    if ($title === '') jsonResponse(['error' => 'Informe o título da página.'], 400);
    $slug = array_key_exists('slug', $body) ? slugify((string) $body['slug']) : $row['slug'];
    if ($slug !== $row['slug']) {
        $check = $db->prepare('SELECT id FROM site_pages WHERE slug = ? AND id != ?');
        $check->execute([$slug, $row['id']]);
        if ($check->fetch()) jsonResponse(['error' => 'Já existe uma página com esse endereço.'], 409);
    }
    $pageBody = array_key_exists('body', $body) ? (string) $body['body'] : $row['body'];
    $visible = array_key_exists('is_visible', $body) ? (!empty($body['is_visible']) ? 1 : 0) : (int) $row['is_visible'];
    $order = array_key_exists('sort_order', $body) ? (int) $body['sort_order'] : (int) $row['sort_order'];
    $upd = $db->prepare('UPDATE site_pages SET slug = ?, title = ?, body = ?, is_visible = ?, sort_order = ?, updated_at = ? WHERE id = ?');
    $upd->execute([$slug, $title, $pageBody, $visible, $order, cmsNow(), $row['id']]);
    jsonResponse(['ok' => true, 'id' => $row['id'], 'slug' => $slug]);
}

if (preg_match('#^/pages/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'DELETE') {
    requireAuth();
    $db = getDB();
    $stmt = $db->prepare('DELETE FROM site_pages WHERE id = ? OR slug = ?');
    $stmt->execute([$matches[1], $matches[1]]);
    if ($stmt->rowCount() === 0) jsonResponse(['error' => 'Página não encontrada'], 404);
    jsonResponse(['ok' => true]);
}

if ($path === '/settings' && $method === 'GET') {
    $db = getDB();
    jsonResponse(['settings' => loadSiteSettings($db)]);
}

if ($path === '/settings' && ($method === 'PUT' || $method === 'POST')) {
    requireAuth();
    $db = getDB();
    $allowed = [
        'site_title', 'site_subtitle', 'logo_url', 'logo_invert',
        'footer_about', 'footer_copyright', 'footer_credit',
        'footer_nav_label', 'footer_institutional_label', 'footer_image_url',
        'hero_images', 'hero_interval', 'hero_kenburns',
        'home_badge', 'home_eyebrow', 'home_title', 'home_lead', 'home_search_placeholder',
        'explore_badge', 'explore_title', 'explore_lead', 'explore_search_placeholder',
    ];
    $incoming = $body['settings'] ?? $body;
    if (!is_array($incoming)) jsonResponse(['error' => 'Dados inválidos.'], 400);
    $upsert = $db->prepare('INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
    foreach ($allowed as $key) {
        if (!array_key_exists($key, $incoming)) continue;
        $upsert->execute([$key, (string) $incoming[$key]]);
    }
    jsonResponse(['ok' => true, 'settings' => loadSiteSettings($db)]);
}

// 404 para rotas inexistentes
jsonResponse(['error' => 'Endpoint não encontrado', 'path' => $path], 404);
