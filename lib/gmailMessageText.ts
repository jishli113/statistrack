import type { gmail_v1 } from 'googleapis'

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

function decodeHtmlEntities(input: string): string {
  // Minimal HTML entity decoding (enough for email bodies from providers like Workday).
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCharCode(code) : ''
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      const code = parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCharCode(code) : ''
    })
}

function htmlToPlainText(html: string): string {
  // Remove style/script blocks and convert some common tags to newlines before stripping tags.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  // Decode entities and normalize whitespace.
  const decoded = decodeHtmlEntities(cleaned)
  return decoded
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Workday/Workday-like templates often leave a lone "Click" after link stripping.
    .replace(/\bClick\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function textFromParts(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return ''
  const mime = part.mimeType ?? ''
  if (part.body?.data) {
    const raw = decodeBase64Url(part.body.data)
    if (mime.includes('text/html')) return htmlToPlainText(raw)
    if (mime.includes('text/')) return raw
    return ''
  }
  if (part.parts?.length) {
    return part.parts.map(textFromParts).filter(Boolean).join('\n')
  }
  return ''
}

export function getGmailMessageSearchText(msg: gmail_v1.Schema$Message): string {
  const headers = msg.payload?.headers ?? []
  const subject =
    headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? ''
  const body = textFromParts(msg.payload ?? undefined)
  return `${subject}\n${body}`
}
