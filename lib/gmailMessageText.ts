import type { gmail_v1 } from 'googleapis'

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

/** Recursively collect decoded text from Gmail message parts (plain + html). */
function textFromParts(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return ''
  const mime = part.mimeType ?? ''
  if (part.body?.data) {
    const raw = decodeBase64Url(part.body.data)
    if (mime.includes('text/')) return raw
    return ''
  }
  if (part.parts?.length) {
    return part.parts.map(textFromParts).filter(Boolean).join('\n')
  }
  return ''
}

/** Subject + body text for keyword scoring. */
export function getGmailMessageSearchText(msg: gmail_v1.Schema$Message): string {
  const headers = msg.payload?.headers ?? []
  const subject =
    headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? ''
  const body = textFromParts(msg.payload ?? undefined)
  return `${subject}\n${body}`
}
