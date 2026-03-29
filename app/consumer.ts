import type { JobApplication, Prisma } from '@prisma/client'
import { redisMQueue, redisRateLimit, createGmailReceiveQueue } from '@/app/connection'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { sumKeywordMatches } from '@/lib/emailTriggerWords'
import { getGmailMessageSearchText } from '@/lib/gmailMessageText'
import { claudeResponse } from '@/app/evalutation'

type Job = { userId: string }
//Initial backoff of one second
const RECEIVE_BACKOFF_INITIAL_MS = 1_000
//Maximum backoff of three minutes
const RECEIVE_BACKOFF_MAX_MS = 3 * 60 * 1_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const JobApplicationStatus = {
  Applied: 'Applied',
  Interview: 'Interview',
  Offer: 'Offer',
  Rejected_Direct: 'Rejected_Direct',
  Rejected_After_Interview: 'Rejected_After_Interview',
} as const

const truncateEmailText = (text: string, maxChars = 500) => {
  const t = text.trim().replace(/[\r\n]/g, '')
  if (t.length <= maxChars) return t
  return t.slice(0, maxChars)
}

const sanitizeForLLM = (text: string) => {
  let sanitized = text
  const tokenMap = new Map<string, string>()
  const tokenCounters = new Map<string, number>()

  const replaceWithStableToken = (
    input: string,
    pattern: RegExp,
    prefix: 'EMAIL' | 'PHONE' | 'URL' | 'ID'
  ) =>
    input.replace(pattern, (match) => {
      const key = match.trim().toLowerCase()
      const existing = tokenMap.get(key)
      if (existing) return existing
      const next = (tokenCounters.get(prefix) ?? 0) + 1
      tokenCounters.set(prefix, next)
      const token = `[${prefix}_${next}]`
      tokenMap.set(key, token)
      return token
    })

  sanitized = replaceWithStableToken(
    sanitized,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    'EMAIL'
  )
  sanitized = replaceWithStableToken(
    sanitized,
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g,
    'PHONE'
  )
  sanitized = replaceWithStableToken(
    sanitized,
    /\bhttps?:\/\/[^\s<>"']+/gi,
    'URL'
  )
  sanitized = replaceWithStableToken(
    sanitized,
    /\b(?:candidate|applicant|application|requisition|req|job)\s*[:#-]?\s*[a-z0-9-]{5,}\b/gi,
    'ID'
  )

  return sanitized
}

const gmailSearchAfterDay = (d: Date) => {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `after:${y}/${m}/${day}`
}

function parseJobStatusFromClaude(
  parsedType: unknown
): JobApplication['status'] {
  const raw = String(parsedType ?? '').trim()
  if (raw === 'Applied') return JobApplicationStatus.Applied
  if (raw === 'Interview') return JobApplicationStatus.Interview
  if (raw === 'Offer') return JobApplicationStatus.Offer
  if (raw === 'Rejected (Direct)') return JobApplicationStatus.Rejected_Direct
  if (raw === 'Rejected (After Interview)') return JobApplicationStatus.Rejected_After_Interview
  if (raw === 'Rejected') return JobApplicationStatus.Rejected_Direct
  return JobApplicationStatus.Applied
}

function resolveStatusForUpdate(
  existingStatus: JobApplication['status'],
  parsedType: unknown
): JobApplication['status'] {
  const raw = String(parsedType ?? '').trim()
  if (raw === 'Rejected') {
    if (existingStatus === JobApplicationStatus.Applied) {
      return JobApplicationStatus.Rejected_Direct
    }
    if (existingStatus === JobApplicationStatus.Interview) {
      return JobApplicationStatus.Rejected_After_Interview
    }
  }
  return parseJobStatusFromClaude(parsedType)
}

export const consumeMessage = async () => {
  console.log('[consumer] setup start')

  let receiveBackoffMs = RECEIVE_BACKOFF_INITIAL_MS

  while (true) {
    let message: { body: Job; streamId: string } | null | undefined

    try {
      const receiveQueue = createGmailReceiveQueue()
      message = await receiveQueue.receiveMessage<Job>(5000)
    } catch (err) {
      console.error('[consumer] receiveMessage failed', err)
      await sleep(receiveBackoffMs)
      receiveBackoffMs = Math.min(RECEIVE_BACKOFF_MAX_MS, receiveBackoffMs * 2)
      continue
    }

    console.log(redisMQueue.concurrencyCounter, "CONCURRENCY COUNTER")
    if (!message) {
      await sleep(receiveBackoffMs)
      receiveBackoffMs = Math.min(RECEIVE_BACKOFF_MAX_MS, receiveBackoffMs * 2)
      continue
    }

    receiveBackoffMs = RECEIVE_BACKOFF_INITIAL_MS

    const messageData = message.body
    const userId = messageData.userId
    console.log('[consumer] message received', { streamId: message.streamId, hasUserId: Boolean(userId) })

    const account = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
      select: { refresh_token: true },
    })
    const userRow = await prisma.user.findUnique({
      where: { id: userId },
      select: { gmailLastSynced: true },
    })

    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!
    )
    if (!account || !account.refresh_token) {
      console.log('[consumer] missing google account token, skipping', { hasAccount: Boolean(account), userId })
      continue
    }
    oauth2.setCredentials({
      refresh_token: account.refresh_token,
    })
    const gmail = google.gmail({ version: 'v1', auth: oauth2 })
    const lastSynced = userRow?.gmailLastSynced
    const cutoffMs = lastSynced?.getTime() ?? 0
    const listQuery = lastSynced ? gmailSearchAfterDay(lastSynced) : undefined
    let pageToken: string | undefined
    let maxInternalDateMs = cutoffMs

    while (true) {
      const res = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 20,
        pageToken,
        q: listQuery,
      })
      if (!res.data.messages?.length) break
      console.log('res.data.messages', res.data.messages)

      const listed = res.data.messages ?? []
      console.log('[consumer] fetched gmail batch', { listedCount: listed.length })

      await Promise.all(
        listed.map(async (ref) => {
          if (!ref.id) return
          console.log("waiting?")
          const {success, remaining} = await redisRateLimit.blockUntilReady(
            `${userId}_gmail_messages_list`,
            60000,
          )
          console.log('success', success)
          console.log('remaining', remaining)
          if (!success){
            console.log('[consumer] rate limit exceeded, timed out', { remaining })
            return
          } 
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: ref.id,
            format: 'full',
          })
          if (!full.data) return
          const internalMs = full.data.internalDate
            ? Number(full.data.internalDate)
            : 0
          if (internalMs <= cutoffMs) return
          maxInternalDateMs = Math.max(maxInternalDateMs, internalMs)
          const text = getGmailMessageSearchText(full.data)
          const truncatedText = truncateEmailText(text.toString())
          const score = sumKeywordMatches(truncatedText)
          console.log('score', score)

          if (score >= 7) {
            const sanitizedText = sanitizeForLLM(truncatedText)
            console.log('[consumer] email score >= 7', {
              score,
              truncatedLength: truncatedText.length,
              sanitizedLength: sanitizedText.length,
            })
            const response = await claudeResponse(sanitizedText)
            console.log("response", response)
            const textBlock = response.content.find((b) => b.type === 'text')
            if (!textBlock || textBlock.type !== 'text') {
              console.error('No text block in Claude response', response.content)
              return
            }
            const parsedData = JSON.parse(textBlock.text)
            if (parsedData.application === 'yes') {
              console.log('Application email detected')
            }

            const appliedDateFromEmail = full.data.internalDate
              ? new Date(Number(full.data.internalDate))
              : new Date()

            if (parsedData.job_id) {
              const company = String(parsedData.company ?? '')
              const externalJobId = String(parsedData.job_id)
              const existing = await prisma.jobApplication.findFirst({
                where: {
                  userId,
                  company,
                  externalJobId,
                },
              })
              if (existing) {
                await prisma.jobApplication.update({
                  where: { id: existing.id },
                  data: {
                    status: resolveStatusForUpdate(existing.status, parsedData.type),
                  },
                })
              } else {
                await prisma.jobApplication.create({
                  data: {
                    userId,
                    company,
                    position: String(parsedData.job_title ?? ''),
                    location: parsedData.location
                      ? String(parsedData.location)
                      : null,
                    status: parseJobStatusFromClaude(parsedData.type),
                    appliedDate: appliedDateFromEmail,
                    externalJobId,
                  },
                })
              }
            } else if (parsedData.location) {
              const company = String(parsedData.company ?? '')
              const position = String(parsedData.job_title ?? '')
              const location = String(parsedData.location)
              const existing = await prisma.jobApplication.findFirst({
                where: {
                  userId,
                  company,
                  position,
                  location,
                },
              })
              if (existing) {
                await prisma.jobApplication.update({
                  where: { id: existing.id },
                  data: {
                    status: resolveStatusForUpdate(existing.status, parsedData.type),
                    appliedDate: new Date(),
                  },
                })
              } else {
                await prisma.jobApplication.create({
                  data: {
                    userId,
                    company,
                    position,
                    location,
                    status: parseJobStatusFromClaude(parsedData.type),
                    appliedDate: appliedDateFromEmail,
                    externalJobId: parsedData.job_id
                      ? String(parsedData.job_id)
                      : null,
                  },
                })
              }
            } else {
              const candidates = await prisma.jobApplication.findMany({
                where: {
                  userId,
                  company: parsedData.company,
                  position: parsedData.job_title,
                },
                orderBy: { updatedAt: 'desc' },
              })

              if (candidates.length === 0) {
                console.log("creating new job application")
                await prisma.jobApplication.create({
                  data: {
                    userId,
                    company: String(parsedData.company ?? ''),
                    position: String(parsedData.job_title ?? ''),
                    location: parsedData.location
                      ? String(parsedData.location)
                      : null,
                    status: parseJobStatusFromClaude(parsedData.type),
                    appliedDate: appliedDateFromEmail,
                    externalJobId: parsedData.job_id
                      ? String(parsedData.job_id)
                      : null,
                  },
                })
              } else {
                console.log("updating existing job application")
                await prisma.jobApplication.update({
                  where: { id: candidates[0].id },
                  data: {
                    status: resolveStatusForUpdate(
                      candidates[0].status,
                      parsedData.type
                    ),
                    appliedDate: new Date(),
                  },
                })
              }
            }
          }
        })
      )

      pageToken = res.data.nextPageToken ?? undefined
      if (!pageToken) break
    }

    if (maxInternalDateMs > cutoffMs) {
      const data: Prisma.UserUpdateInput = {
        gmailLastSynced: new Date(maxInternalDateMs),
      }
      console.log("updating user gmailLastSynced", data)
      await prisma.user.update({
        where: { id: userId },
        data,
      })
    }
  }
}