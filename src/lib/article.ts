export type ArticleFormat = 'text' | 'html' | 'rich' | 'markdown'

const MARKER = /^<!--acervo:(text|html|rich|markdown)-->\n?/
const BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote', 'pre', 'hr', 'div'])

export function readArticle(stored: string): { format: ArticleFormat; source: string } {
  const match = stored.match(MARKER)
  if (!match) return { format: 'html', source: stored }
  return {
    format: match[1] as ArticleFormat,
    source: stored.slice(match[0].length),
  }
}

export function writeArticle(format: ArticleFormat, source: string): string {
  if (format === 'text' || format === 'markdown') {
    const trimmed = source.replace(/^\n+|\n+$/g, '')
    if (!trimmed.trim()) return ''
    return `<!--acervo:${format}-->\n${trimmed}`
  }
  const clean = sanitizeHtml(source)
  if (!clean) return ''
  if (format === 'rich') return `<!--acervo:rich-->\n${clean}`
  return clean
}

export function articleToHtml(stored: string): string {
  const { format, source } = readArticle(stored)
  if (!source.trim()) return ''
  if (format === 'text') return plainToHtml(source)
  if (format === 'markdown') return markdownToHtml(source)
  return sanitizeHtml(source)
}

export function convertArticle(from: ArticleFormat, source: string, to: ArticleFormat): string {
  if (from === to) return source
  const html = from === 'text'
    ? plainToHtml(source)
    : from === 'markdown'
      ? markdownToHtml(source)
      : sanitizeHtml(source)
  if (to === 'html' || to === 'rich') return html
  if (to === 'text') return htmlToPlain(html)
  return htmlToMarkdown(html)
}

export function plainToHtml(source: string): string {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/)
  return blocks
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function markdownToHtml(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }
    if (line.startsWith('```')) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith('```')) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }
    if (/^---+$/.test(line.trim())) {
      out.push('<hr>')
      index += 1
      continue
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length + 1
      out.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      index += 1
      continue
    }
    if (line.startsWith('>')) {
      const quote: string[] = []
      while (index < lines.length && lines[index].startsWith('>')) {
        quote.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      out.push(`<blockquote><p>${inlineMarkdown(quote.join(' '))}</p></blockquote>`)
      continue
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''))
        index += 1
      }
      out.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ul>`)
      continue
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''))
        index += 1
      }
      out.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('')}</ol>`)
      continue
    }
    const paragraph = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !isMarkdownBlock(lines[index])) {
      paragraph.push(lines[index])
      index += 1
    }
    out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`)
  }

  return out.join('')
}

export function sanitizeHtml(html: string): string {
  if (!html.trim() || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  return sanitizeChildren(root).replace(/^(?:<p>(?:<br>)?<\/p>)+|(?:<p>(?:<br>)?<\/p>)+$/g, '')
}

function sanitizeChildren(node: Node): string {
  let output = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      output += escapeHtml(child.textContent || '')
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const element = child as HTMLElement
    let tag = element.tagName.toLowerCase()
    if (DROPPED.has(tag)) return
    if (tag === 'b') tag = 'strong'
    if (tag === 'i') tag = 'em'
    if (tag === 'div') {
      const inner = sanitizeChildren(element)
      const hasBlock = [...element.children].some((entry) => BLOCK.has(entry.tagName.toLowerCase()))
      output += hasBlock || !inner.trim() ? inner : `<p>${inner}</p>`
      return
    }
    if (tag === 'br' || tag === 'hr') {
      output += `<${tag}>`
      return
    }
    if (tag === 'a') {
      const href = safeHref(element.getAttribute('href') || '')
      const inner = sanitizeChildren(element)
      output += href ? `<a href="${escapeAttr(href)}">${inner}</a>` : inner
      return
    }
    if (tag === 'img') {
      const src = safeHref(element.getAttribute('src') || '')
      if (!src) return
      const alt = escapeAttr(element.getAttribute('alt') || '')
      output += `<img src="${escapeAttr(src)}" alt="${alt}">`
      return
    }
    if (!ALLOWED.has(tag)) {
      output += sanitizeChildren(element)
      return
    }
    if (tag === 'pre') {
      output += `<pre><code>${escapeHtml(element.textContent || '')}</code></pre>`
      return
    }
    const inner = sanitizeChildren(element)
    if ((tag === 'p' || tag === 'li') && !inner.replace(/<br>/g, '').trim()) return
    output += `<${tag}>${inner}</${tag}>`
  })
  return output
}

const ALLOWED = new Set(['p', 'h2', 'h3', 'h4', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote', 'code'])
const DROPPED = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'svg', 'math'])

function htmlToPlain(html: string): string {
  if (typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  const blocks: string[] = []
  const visit = (element: Element) => {
    const tag = element.tagName.toLowerCase()
    if (['p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote', 'pre'].includes(tag)) {
      const text = element.textContent?.replace(/\s+/g, ' ').trim()
      if (text) blocks.push(text)
      return
    }
    ;[...element.children].forEach(visit)
  }
  ;[...root.children].forEach(visit)
  if (blocks.length === 0) return root.textContent?.trim() || ''
  return blocks.join('\n\n')
}

function htmlToMarkdown(html: string): string {
  if (typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return ''
  const parts: string[] = []
  const visit = (element: Element) => {
    const tag = element.tagName.toLowerCase()
    if (tag === 'h1' || tag === 'h2') parts.push(`# ${inlineToMarkdown(element).trim()}\n\n`)
    else if (tag === 'h3') parts.push(`## ${inlineToMarkdown(element).trim()}\n\n`)
    else if (tag === 'h4') parts.push(`### ${inlineToMarkdown(element).trim()}\n\n`)
    else if (tag === 'p') parts.push(`${inlineToMarkdown(element).trim()}\n\n`)
    else if (tag === 'blockquote') parts.push(`> ${inlineToMarkdown(element).trim()}\n\n`)
    else if (tag === 'hr') parts.push('---\n\n')
    else if (tag === 'pre') parts.push(`\`\`\`\n${element.textContent || ''}\n\`\`\`\n\n`)
    else if (tag === 'ul' || tag === 'ol') {
      ;[...element.children].forEach((item, itemIndex) => {
        if (item.tagName.toLowerCase() !== 'li') return
        const marker = tag === 'ol' ? `${itemIndex + 1}. ` : '- '
        parts.push(`${marker}${inlineToMarkdown(item).trim()}\n`)
      })
      parts.push('\n')
    } else {
      ;[...element.children].forEach(visit)
    }
  }
  ;[...root.children].forEach(visit)
  return parts.join('').trim()
}

function inlineToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const element = node as HTMLElement
  const tag = element.tagName.toLowerCase()
  const inner = [...element.childNodes].map(inlineToMarkdown).join('')
  if (tag === 'strong' || tag === 'b') return `**${inner}**`
  if (tag === 'em' || tag === 'i') return `*${inner}*`
  if (tag === 'code') return `\`${inner}\``
  if (tag === 'a') {
    const href = element.getAttribute('href') || ''
    return href ? `[${inner}](${href})` : inner
  }
  if (tag === 'br') return '\n'
  return inner
}

function inlineMarkdown(raw: string): string {
  const escaped = escapeHtml(raw)
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const safe = safeHref(decodeEntities(href))
      return safe ? `<a href="${escapeAttr(safe)}">${label}</a>` : label
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
}

function isMarkdownBlock(line: string) {
  return /^(#{1,3}\s|```|>|---+$|\s*[-*]\s+|\s*\d+\.\s+)/.test(line)
}

function safeHref(value: string): string | null {
  const href = value.trim()
  if (!href) return null
  if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\')) return href
  try {
    const url = new URL(href)
    if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') return url.href
  } catch {
    return null
  }
  return null
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}
