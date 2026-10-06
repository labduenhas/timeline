<?php
// =====================================================================
// ACERVO TIMELINE — API REST PHP para MariaDB 10.4+
// Compatível com Apache / Nginx / DirectAdmin
// =====================================================================

require_once __DIR__ . '/config.php';

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
        } catch (PDOException $e) {
            jsonResponse([
                'error' => 'Falha na conexão com o banco de dados MariaDB',
                'details' => $e->getMessage()
            ], 500);
        }
    }
    return $pdo;
}

function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requireAuth() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = trim(preg_replace('/^Bearer\s+/i', '', $authHeader));

    if (!$token || $token !== ADMIN_SECRET) {
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

    $query = "
      SELECT 
        d.id, d.slug, d.title, d.subtitle, d.doc_date, d.date_precision,
        d.doc_type, d.thumbnail_key, d.author, d.location,
        d.description, d.source_url, d.is_featured, d.view_count,
        GROUP_CONCAT(DISTINCT c.slug) as category_slugs,
        GROUP_CONCAT(DISTINCT c.name) as category_names,
        GROUP_CONCAT(DISTINCT c.color) as category_colors,
        GROUP_CONCAT(DISTINCT t.name) as tag_names
      FROM documents d
      LEFT JOIN document_categories dc ON d.id = dc.document_id
      LEFT JOIN categories c ON dc.category_id = c.id
      LEFT JOIN document_tags dt ON d.id = dt.document_id
      LEFT JOIN tags t ON dt.tag_id = t.id
      WHERE d.is_public = 1 AND d.deleted_at IS NULL
    ";
    $params = [];

    if ($category) {
        $query .= " AND c.slug = ?";
        $params[] = $category;
    }
    if ($from) {
        $query .= " AND d.doc_date >= ?";
        $params[] = "{$from}-01-01";
    }
    if ($to) {
        $query .= " AND d.doc_date <= ?";
        $params[] = "{$to}-12-31";
    }
    if ($search) {
        $query .= " AND (d.title LIKE ? OR d.description LIKE ? OR d.author LIKE ?)";
        $term = "%{$search}%";
        $params[] = $term;
        $params[] = $term;
        $params[] = $term;
    }
    if ($tags) {
        $tagList = array_filter(array_map('trim', explode(',', $tags)));
        if (!empty($tagList)) {
            $inClause = implode(',', array_fill(0, count($tagList), '?'));
            $query .= " AND t.slug IN ($inClause)";
            foreach ($tagList as $tg) $params[] = $tg;
        }
    }

    $query .= " GROUP BY d.id ORDER BY d.doc_date ASC";

    $stmt = $db->prepare($query);
    $stmt->execute($params);
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
            'author' => $row['author'],
            'location' => $row['location'],
            'is_featured' => (bool)$row['is_featured'],
            'view_count' => (int)$row['view_count'],
            'thumbnail_url' => resolveMediaUrl($row['thumbnail_key']),
            'categories' => $cats,
            'tags' => $row['tag_names'] ? explode(',', $row['tag_names']) : [],
        ];
    }

    // Buscar backgrounds de época
    $bgStmt = $db->query("SELECT * FROM period_backgrounds ORDER BY year_start ASC");
    $bgs = $bgStmt->fetchAll();
    $periodBackgrounds = [];
    foreach ($bgs as $bg) {
        $periodBackgrounds[] = [
            'id' => $bg['id'],
            'year_start' => (int)$bg['year_start'],
            'year_end' => (int)$bg['year_end'],
            'image_url' => resolveMediaUrl($bg['image_key']),
            'description' => $bg['description'] ?? '',
            'opacity' => (float)$bg['opacity'],
        ];
    }

    jsonResponse([
        'items' => $items,
        'total' => count($items),
        'period_backgrounds' => $periodBackgrounds,
        'generated_at' => time() * 1000
    ]);
}

// 3. Documentos (Lista Paginada e Detalhes)
if ($path === '/docs' && $method === 'GET') {
    $db = getDB();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    $search = $_GET['search'] ?? null;
    $category = $_GET['category'] ?? null;
    $tag = $_GET['tag'] ?? null;
    $docType = $_GET['type'] ?? null;

    $where = "WHERE d.is_public = 1 AND d.deleted_at IS NULL";
    $params = [];

    if ($search) {
        $where .= " AND (d.title LIKE ? OR d.description LIKE ? OR d.author LIKE ?)";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
        $params[] = "%{$search}%";
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
        d.doc_type, d.thumbnail_key, d.cover_image_key, d.author, d.publisher, d.location,
        d.is_featured, d.view_count, d.created_at,
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
            'author' => $row['author'],
            'publisher' => $row['publisher'],
            'location' => $row['location'],
            'is_featured' => (bool)$row['is_featured'],
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

// 4. Detalhes de Documento por Slug: GET /docs/{slug}
if (preg_match('#^/docs/([a-zA-Z0-9_-]+)$#', $path, $matches) && $method === 'GET') {
    $db = getDB();
    $slug = $matches[1];

    $stmt = $db->prepare("SELECT * FROM documents WHERE slug = ? AND deleted_at IS NULL");
    $stmt->execute([$slug]);
    $doc = $stmt->fetch();

    if (!$doc) {
        jsonResponse(['error' => 'Documento não encontrado'], 404);
    }

    // Incrementa visualização
    $db->prepare("UPDATE documents SET view_count = view_count + 1 WHERE id = ?")->execute([$doc['id']]);

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
            'url' => resolveMediaUrl($m['file_key']),
        ];
    }

    // Documentos relacionados
    $relStmt = $db->prepare("
      SELECT id, slug, title, thumbnail_key, doc_date, doc_type
      FROM documents
      WHERE id != ? AND is_public = 1 AND deleted_at IS NULL
      ORDER BY RAND() LIMIT 4
    ");
    $relStmt->execute([$doc['id']]);
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
        'author' => $doc['author'],
        'publisher' => $doc['publisher'],
        'location' => $doc['location'],
        'language' => $doc['language'],
        'is_public' => (bool)$doc['is_public'],
        'is_featured' => (bool)$doc['is_featured'],
        'view_count' => (int)$doc['view_count'] + 1,
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

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $uniqueName = bin2hex(random_bytes(16)) . '.' . strtolower($ext);
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
    $secret = $body['secret'] ?? '';
    if ($secret === ADMIN_SECRET) {
        jsonResponse(['ok' => true, 'valid' => true]);
    }
    jsonResponse(['error' => 'Chave de administração inválida'], 401);
}

// 13. Estatísticas Admin: GET /admin/stats
if ($path === '/admin/stats' && $method === 'GET') {
    requireAuth();
    $db = getDB();

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

// 404 para rotas inexistentes
jsonResponse(['error' => 'Endpoint não encontrado', 'path' => $path], 404);
