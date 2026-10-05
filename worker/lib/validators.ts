import { z } from 'zod'

export const DocTypeEnum = z.enum([
  'image',
  'pdf',
  'txt',
  'video_file',
  'video_url',
  'audio',
  'document',
  'link'
])

export const DatePrecisionEnum = z.enum(['year', 'month', 'day'])

export const CreateDocumentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(255),
  subtitle: z.string().max(255).optional().nullable(),
  slug: z.string().max(255).optional(),
  description: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  doc_date: z.string().regex(/^\d{4}(-\d{2})?(-\d{2})?$/, 'Formato de data inválido. Use YYYY, YYYY-MM ou YYYY-MM-DD'),
  date_precision: DatePrecisionEnum.default('day'),
  doc_type: DocTypeEnum,
  source_url: z.string().url('URL inválida').optional().nullable().or(z.literal('')),
  file_key: z.string().optional().nullable(),
  thumbnail_key: z.string().optional().nullable(),
  cover_image_key: z.string().optional().nullable(),
  author: z.string().max(255).optional().nullable(),
  publisher: z.string().max(255).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  language: z.string().default('pt-BR'),
  is_public: z.number().int().min(0).max(1).default(1),
  is_featured: z.number().int().min(0).max(1).default(0),
  categories: z.array(z.string()).default([]), // category ids or slugs
  tags: z.array(z.string()).default([]), // tag ids or names
})

export const UpdateDocumentSchema = CreateDocumentSchema.partial()

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  slug: z.string().max(100).optional(),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor hexadecimal inválida').default('#6366f1'),
  icon: z.string().optional().nullable(),
  parent_id: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
})

export const CreateTagSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  slug: z.string().max(100).optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Cor hexadecimal inválida').default('#94a3b8'),
})
