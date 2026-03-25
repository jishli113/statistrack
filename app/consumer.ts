import { connectRabbitMQ } from '@/app/connection'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { sumKeywordMatches } from '@/lib/emailTriggerWords'
import { getGmailMessageSearchText } from '@/lib/gmailMessageText'

const consumeMessage = async (queue: string) => {
  const { channel } = await connectRabbitMQ()
  await channel.assertQueue(queue, { durable: true })
  channel.consume(queue, async (message) => {
    if (!message) return
    const messageData = JSON.parse(message.content.toString())
    const userId = messageData.userId as string
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'google' },
    })
    if (message) {
      console.log(`Message received from ${queue}: ${message.content.toString()}`)
      const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID!,
        process.env.GOOGLE_CLIENT_SECRET!
      )
      if (!account || !account.refresh_token) return
      oauth2.setCredentials({
        refresh_token: account.refresh_token,
      })
      const gmail = google.gmail({ version: 'v1', auth: oauth2 })
      let pageToken = messageData.pageToken as string | undefined
      while (true) {
        const res = await gmail.users.messages.list({
          userId: 'me',
          maxResults: 50,
          pageToken: pageToken,
        })
        if (!res.data.messages?.length) break
        const listed = res.data.messages ?? []
        await Promise.all(
          listed.map(async (ref) => {
            if (!ref.id) return
            const full = await gmail.users.messages.get({
              userId: 'me',
              id: ref.id,
              format: 'full',
            })
            if (!full.data) return
            const text = getGmailMessageSearchText(full.data)
            const score = sumKeywordMatches(text)
            // proceed to LLM when score crosses threshold
            if (score >= 6) {
              console.log('keyword score', score, 'message', ref.id)
            }
          })
        )
        pageToken = res.data.nextPageToken ?? undefined
        if (!pageToken) break
      }
      channel.ack(message)
    }
  })
}