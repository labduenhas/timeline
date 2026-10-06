import { articleToHtml } from '@/lib/article'

export function ArticleBody({ stored }: { stored: string }) {
  const html = articleToHtml(stored)
  if (!html) return null
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
}
