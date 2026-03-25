import { connectRabbitMQ } from '@/app/connection'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { sumKeywordMatches } from '@/lib/emailTriggerWords'
import { getGmailMessageSearchText } from '@/lib/gmailMessageText'
import { claudeResponse } from '@/app/evalutation'

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
                const response = await claudeResponse()
                const textBlock = response.content.find((b) => b.type === 'text')
                if (!textBlock || textBlock.type !== 'text') {
                  console.error('No text block in Claude response', response.content)
                  return
                }
                const parsedData = JSON.parse(textBlock.text)
                if (parsedData.application == "yes") {
                    console.log('Application email detected')
                }
                if (parsedData.job_id) {
                    await prisma.jobApplication.findFirst({
                        where: {
                          userId,
                          company: parsedData.company,
                          externalJobId: parsedData.job_id
                        },
                      })
                  } else if (parsedData.location) {
                    await prisma.jobApplication.findFirst({
                      where: {
                        userId,
                        company: parsedData.company,
                        position: parsedData.job_title,
                        location: parsedData.location,
                      },
                    })
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
                      const appliedDate = full.data.internalDate
                        ? new Date(Number(full.data.internalDate))
                        : new Date()
                      await prisma.jobApplication.create({
                        data: {
                          userId,
                          company: String(parsedData.company ?? ''),
                          position: String(parsedData.job_title ?? ''),
                          location: parsedData.location
                            ? String(parsedData.location)
                            : null,
                          status: parsedData.type,
                          appliedDate,
                          externalJobId: parsedData.job_id
                            ? String(parsedData.job_id)
                            : null,
                        },
                      })
                    } else{
                      await prisma.jobApplication.update({
                        where: { id: candidates[0].id },
                        data: {
                          status: parsedData.type,
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
      channel.ack(message)
    }
  })
}