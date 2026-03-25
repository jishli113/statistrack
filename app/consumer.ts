import { connectRabbitMQ } from '@/app/connection'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { sumKeywordMatches } from '@/lib/emailTriggerWords'
import { getGmailMessageSearchText } from '@/lib/gmailMessageText'
import Anthropic from '@anthropic-ai/sdk';

const anthropicClient = new Anthropic({});

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
                const claudeResponse = await anthropicClient.messages.create({
                    model: "claude-haiku-4-5-20251001",
                    max_tokens:Number(process.env.MAX_TOKENS!),
                    messages: [
                        {
                            role:"user",
                            content: [
                                {
                                    type: "text",
                                    text: process.env.EMAIL_PARSE_PROMPT!
                                }
                            ]
                        }
                    ],
                    temperature: 0.0,
                    output_config: {
                        format: {
                          type: 'json_schema',
                          schema: {
                            type: 'object',
                            properties: {
                              application: {type: 'string', description: 'If the email is related to a job application'},
                              type: {type: 'string', description: 'Type of email: application, interview, rejection, etc.'},
                              company: { type: 'string', description: 'Company name' },
                              job_title: { type: 'string', description: 'Specific job role (e.g., Software Engineer)' },
                              job_id: { type: 'string', description: 'Job ID or requisition number' },
                              location: { type: 'string', description: 'City, state/country (e.g., New York, NY)' },
                            },
                            required: ['company', 'job_title', 'job_id', 'location'],
                            additionalProperties: false,
                          },
                        },
                      },
                })
                const textBlock = claudeResponse.content.find((b) => b.type === 'text')
                if (!textBlock || textBlock.type !== 'text') {
                  console.error('No text block in Claude response', claudeResponse.content)
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
, // add field to schema first
                        },
                      })
                  } else if (parsedData.location) {
                    await prisma.jobApplication.findFirst({
                      where: {
                        userId,
                        company: parsedData.company,
                        position: parsedData.job_title,
                        location: parsedData.location, // use null check: only if email gave a location
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
                      // create new
                    } else if (candidates.length === 1) {
                      // update candidates[0]
                    } else {
                      // narrow with location / job id, or flag for manual review
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