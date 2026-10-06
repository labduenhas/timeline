-- =====================================================================
-- ACERVO TIMELINE — Script de Instalação para MariaDB 10.4+ / MySQL 8.0+
-- Compatível com phpMyAdmin e DirectAdmin
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- 1. Tabela: documents
CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(36) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `body` LONGTEXT DEFAULT NULL,
  `doc_date` VARCHAR(10) NOT NULL,
  `date_precision` ENUM('year', 'month', 'day') NOT NULL DEFAULT 'day',
  `doc_type` VARCHAR(30) NOT NULL,
  `source_url` TEXT DEFAULT NULL,
  `file_key` VARCHAR(500) DEFAULT NULL,
  `thumbnail_key` VARCHAR(500) DEFAULT NULL,
  `cover_image_key` VARCHAR(500) DEFAULT NULL,
  `author` VARCHAR(255) DEFAULT NULL,
  `publisher` VARCHAR(255) DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `language` VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_documents_slug` (`slug`),
  KEY `idx_documents_date` (`doc_date`),
  KEY `idx_documents_public` (`is_public`, `deleted_at`),
  KEY `idx_documents_type` (`doc_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela: categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `color` VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  `icon` VARCHAR(50) DEFAULT NULL,
  `parent_id` VARCHAR(36) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela: tags
CREATE TABLE IF NOT EXISTS `tags` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `color` VARCHAR(20) NOT NULL DEFAULT '#94a3b8',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tags_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela: document_categories
CREATE TABLE IF NOT EXISTS `document_categories` (
  `document_id` VARCHAR(36) NOT NULL,
  `category_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`document_id`, `category_id`),
  KEY `idx_doc_categories_cat` (`category_id`),
  CONSTRAINT `fk_doc_cat_doc` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_cat_cat` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabela: document_tags
CREATE TABLE IF NOT EXISTS `document_tags` (
  `document_id` VARCHAR(36) NOT NULL,
  `tag_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`document_id`, `tag_id`),
  KEY `idx_doc_tags_tag` (`tag_id`),
  CONSTRAINT `fk_doc_tag_doc` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doc_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabela: document_media
CREATE TABLE IF NOT EXISTS `document_media` (
  `id` VARCHAR(36) NOT NULL,
  `document_id` VARCHAR(36) NOT NULL,
  `file_key` VARCHAR(500) NOT NULL,
  `media_type` VARCHAR(30) NOT NULL,
  `caption` VARCHAR(255) DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doc_media_doc` (`document_id`),
  CONSTRAINT `fk_doc_media_doc` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabela: period_backgrounds
CREATE TABLE IF NOT EXISTS `period_backgrounds` (
  `id` VARCHAR(36) NOT NULL,
  `category_id` VARCHAR(36) DEFAULT NULL,
  `year_start` INT NOT NULL,
  `year_end` INT NOT NULL,
  `image_key` VARCHAR(500) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `opacity` DECIMAL(3, 2) NOT NULL DEFAULT 0.35,
  PRIMARY KEY (`id`),
  KEY `idx_period_bg_cat` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tabela: admin_sessions
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- DADOS INICIAIS (SEED)
-- =====================================================================

-- Categorias
INSERT INTO `categories` (`id`, `name`, `slug`, `description`, `color`, `icon`, `sort_order`) VALUES
('cat_historia', 'História & Política', 'historia-politica', 'Documentos históricos, proclamações e manifestos', '#ef4444', 'Landmark', 1),
('cat_ciencia', 'Ciência & Tecnologia', 'ciencia-tecnologia', 'Descobertas, patentes e computação', '#06b6d4', 'Cpu', 2),
('cat_cultura', 'Arte & Cultura', 'arte-cultura', 'Fotografias, gravações musicais e artefatos culturais', '#a855f7', 'Palette', 3),
('cat_imprensa', 'Jornais & Imprensa', 'jornais-imprensa', 'Edições de periódicos, manchetes e recortes', '#f59e0b', 'Newspaper', 4)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Tags
INSERT INTO `tags` (`id`, `name`, `slug`, `color`) VALUES
('tag_brasil', 'Brasil', 'brasil', '#22c55e'),
('tag_manuscrito', 'Manuscrito', 'manuscrito', '#eab308'),
('tag_fotografia', 'Fotografia', 'fotografia', '#3b82f6'),
('tag_audio', 'Gravação Rara', 'gravacao-rara', '#ec4899'),
('tag_revolucao', 'Revolução', 'revolucao', '#f43f5e'),
('tag_computacao', 'Computação', 'computacao', '#8b5cf6')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Planos de fundo da linha do tempo
INSERT INTO `period_backgrounds` (`id`, `category_id`, `year_start`, `year_end`, `image_key`, `description`, `opacity`) VALUES
('bg_1', 'cat_historia', 1880, 1920, 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1920&q=80', 'Era da Belle Époque e Primeira República (1889 - 1920)', 0.35),
('bg_2', 'cat_historia', 1921, 1959, 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?auto=format&fit=crop&w=1920&q=80', 'Era Industrial & Modernismo (1922 - 1959)', 0.40),
('bg_3', 'cat_ciencia', 1960, 1989, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80', 'Corrida Espacial e Primeiros Computadores (1960 - 1989)', 0.45),
('bg_4', 'cat_ciencia', 1990, 2026, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1920&q=80', 'Revolução Digital e Conectividade Global (1990 - 2026)', 0.40)
ON DUPLICATE KEY UPDATE `description`=VALUES(`description`);

-- Documentos Históricos de Exemplo
INSERT INTO `documents` (`id`, `slug`, `title`, `subtitle`, `description`, `body`, `doc_date`, `date_precision`, `doc_type`, `source_url`, `thumbnail_key`, `author`, `publisher`, `location`, `is_public`, `is_featured`, `view_count`) VALUES
(
  'doc_1',
  'proclamacao-da-republica-1889',
  'Proclamação da República do Brasil',
  'Edição Histórica do Diário Oficial',
  'Registro solene da instauração do governo republicano provisório sob a liderança do Marechal Deodoro da Fonseca no Rio de Janeiro.',
  '<h3>A Queda do Império</h3><p>Em 15 de novembro de 1889, nascia a República dos Estados Unidos do Brasil. Este documento reúne as atas preliminares do Governo Provisório e a mensagem à nação assinada por Deodoro da Fonseca e Rui Barbosa.</p><p>O documento original encontra-se preservado no Arquivo Nacional, sendo um dos marcos fundamentais do direito constitucional moderno no país.</p>',
  '1889-11-15',
  'day',
  'document',
  'https://an.gov.br',
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  'Governo Provisório',
  'Imprensa Nacional',
  'Rio de Janeiro, RJ',
  1,
  1,
  1420
),
(
  'doc_2',
  'semana-de-arte-moderna-1922',
  'Semana de Arte Moderna de São Paulo',
  'Catálogo Oficial da Exposição no Theatro Municipal',
  'O divisor de águas estético na literatura, música e artes plásticas brasileiras que redefiniu o conceito de modernismo.',
  '<h3>O Manifesto Paulistano</h3><p>Realizada entre 13 e 17 de fevereiro de 1922, a Semana de Arte Moderna reuniu expoentes como Mário de Andrade, Oswald de Andrade, Anita Malfatti, Di Cavalcanti e Heitor Villa-Lobos.</p><p>A ruptura com o academicismo parnasiano provocou reações calorosas da crítica e estabeleceu a base para o movimento antropofágico.</p>',
  '1922-02-13',
  'day',
  'image',
  'https://theatromunicipal.org.br',
  'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
  'Graça Aranha, Mário de Andrade',
  'Theatro Municipal',
  'São Paulo, SP',
  1,
  1,
  980
),
(
  'doc_3',
  'inauguracao-de-brasilia-1960',
  'Inauguração de Brasília: A Nova Capital',
  'Discurso de Juscelino Kubitschek e Plano Piloto de Lúcio Costa',
  'Consolidação do Plano de Metas e transferência da sede administrativa para o Planalto Central em meio a arquitetura pioneira de Oscar Niemeyer.',
  '<h3>50 Anos em 5</h3><p>Em 21 de abril de 1960, Brasília foi solenemente inaugurada. Este registro contempla as diretrizes urbanísticas de Lúcio Costa e os discursos proferidos na Praça dos Três Poderes.</p>',
  '1960-04-21',
  'day',
  'pdf',
  'https://brasilia.df.gov.br',
  'https://images.unsplash.com/photo-1582560475093-ba66accbc424?auto=format&fit=crop&w=600&q=80',
  'Juscelino Kubitschek, Lúcio Costa',
  'Presidência da República',
  'Brasília, DF',
  1,
  1,
  2100
),
(
  'doc_4',
  'primeiro-computador-patinho-feio-1972',
  'O Projeto Patinho Feio: Primeiro Computador Brasileiro',
  'Relatório Técnico do Laboratório de Sistemas Digitais da USP',
  'Concepção e manufatura do primeiro microcomputador totalmente projetado e construído no Brasil pelo Departamento de Engenharia Elétrica da POLI-USP.',
  '<h3>Autonomia Tecnológica Pioneira</h3><p>Desenvolvido entre 1971 e 1972 sob coordenação do Prof. Célio Tokunaga e equipe, o Patinho Feio possuía 450 blocos de circuitos integrados e 4K de memória magnética.</p>',
  '1972-07-24',
  'day',
  'txt',
  'https://poli.usp.br',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80',
  'LSD / Escola Politécnica da USP',
  'Universidade de São Paulo',
  'São Paulo, SP',
  1,
  0,
  870
),
(
  'doc_5',
  'constituicao-cidada-1988',
  'Promulgação da Constituição Cidadã de 1988',
  'Pronunciamento Histórico de Ulysses Guimarães',
  'A restauração do Estado Democrático de Direito e consagração de direitos civis, sociais e fundamentais após a Assembleia Nacional Constituinte.',
  '<h3>"Traidor da Pátria é o Traidor da Constituição"</h3><p>Em 5 de outubro de 1988, o presidente da Assembleia Nacional Constituinte, Ulysses Guimarães, promulgava a Carta Magna que rege o Brasil contemporâneo.</p>',
  '1988-10-05',
  'day',
  'video_url',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
  'Ulysses Guimarães',
  'Congresso Nacional',
  'Brasília, DF',
  1,
  1,
  3540
),
(
  'doc_6',
  'chegada-da-internet-comercial-1995',
  'Liberação da Internet Comercial e Registro.br',
  'Portaria Interministerial nº 147 e Fundação do CGI.br',
  'Início da operação da rede mundial de computadores para empresas e cidadãos no território nacional.',
  '<h3>A Rede Aberta</h3><p>Em maio de 1995, o Ministério das Comunicações e o Ministério da Ciência e Tecnologia criavam o Comitê Gestor da Internet no Brasil (CGI.br), pavimentando a rede aberta e neutra.</p>',
  '1995-05-31',
  'day',
  'link',
  'https://cgi.br',
  'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
  'CGI.br',
  'Diário Oficial da União',
  'São Paulo / Brasília',
  1,
  0,
  1120
),
(
  'doc_7',
  'lancamento-pix-2020',
  'Lançamento do Pix: Pagamentos Instantâneos',
  'Resolução BCB nº 1 e Especificação do SPI',
  'Revolução na infraestrutura financeira nacional através do sistema de liquidação instantânea desenvolvido e operado pelo Banco Central do Brasil.',
  '<h3>Modernização Bancária Global</h3><p>O Pix transformou a economia digital do país, tornando-se uma das referências mundiais mais velozes em inclusão financeira e digitalização de pagamentos.</p>',
  '2020-11-16',
  'day',
  'document',
  'https://bcb.gov.br',
  'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
  'Banco Central do Brasil',
  'Banco Central',
  'Brasília, DF',
  1,
  1,
  1890
)
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Relações de Categorias
INSERT IGNORE INTO `document_categories` (`document_id`, `category_id`) VALUES
('doc_1', 'cat_historia'),
('doc_2', 'cat_cultura'),
('doc_3', 'cat_historia'),
('doc_4', 'cat_ciencia'),
('doc_5', 'cat_historia'),
('doc_6', 'cat_ciencia'),
('doc_7', 'cat_ciencia');

-- Relações de Tags
INSERT IGNORE INTO `document_tags` (`document_id`, `tag_id`) VALUES
('doc_1', 'tag_brasil'),
('doc_1', 'tag_revolucao'),
('doc_2', 'tag_brasil'),
('doc_2', 'tag_fotografia'),
('doc_3', 'tag_brasil'),
('doc_4', 'tag_brasil'),
('doc_4', 'tag_computacao'),
('doc_5', 'tag_brasil'),
('doc_6', 'tag_computacao'),
('doc_7', 'tag_computacao');

SET FOREIGN_KEY_CHECKS = 1;
