function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function applyPreview(html, { title, description, image, url, hasImage }) {
  const safeTitle = escapeAttr(title)
  const safeDescription = escapeAttr(description)
  const safeImage = escapeAttr(image)
  const safeUrl = escapeAttr(url)
  let next = html
  next = next.replace(/<title>[\s\S]*?<\/title>/, `<title>${safeTitle}</title>`)
  next = next.replace(/(<meta name="description" content=")[^"]*(")/, `$1${safeDescription}$2`)
  next = next.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${safeTitle}$2`)
  next = next.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${safeDescription}$2`)
  next = next.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${safeUrl}$2`)
  next = next.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${safeImage}$2`)
  next = next.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${safeTitle}$2`)
  next = next.replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${safeDescription}$2`)
  next = next.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${safeImage}$2`)
  if (hasImage) {
    next = next.replace(/\s*<meta property="og:image:width" content="1200" \/>/, '')
    next = next.replace(/\s*<meta property="og:image:height" content="630" \/>/, '')
  }
  return next
}

export async function onRequest(context) {
  const slug = context.params.slug
  const pageUrl = new URL(context.request.url)
  const origin = pageUrl.origin
  const indexRes = await context.env.ASSETS.fetch(new URL('/index.html', pageUrl))
  let html = await indexRes.text()

  if (typeof slug === 'string' && /^[A-Za-z0-9_-]+$/.test(slug)) {
    try {
      const previewRes = await fetch(`https://api.anarcopunk.org/og/${encodeURIComponent(slug)}`)
      if (previewRes.ok) {
        const preview = await previewRes.json()
        if (preview && preview.title) {
          html = applyPreview(html, {
            title: preview.title,
            description: preview.description || 'Navegador cronológico e arquivo histórico de documentos, multimídia e artigos.',
            image: preview.image || `${origin}/og.png`,
            url: `${origin}/doc/${slug}`,
            hasImage: Boolean(preview.image),
          })
        }
      }
    } catch {
      // A ficha continua abrindo com a prévia geral do site.
    }
  }

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'public, max-age=300',
    },
  })
}
