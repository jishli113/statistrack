import {connectRabbitMQ} from "@/app/connection"
import {google} from "googleapis"
import { prisma } from "@/lib/prisma"

const consumeMessage = async(queue:string) => {
    const {channel} = await connectRabbitMQ();
    await channel.assertQueue(queue, {durable: true});
    channel.consume(queue, async(message) => {
        if (!message) return
        const userId = message.content.toString().trim()
        const account = await prisma.account.findFirst({
            where: { userId, provider: 'google' },
        })
        //message is the user email
        if (message) {
            const messageData = JSON.parse(message.content.toString())
            console.log(`Message received from ${queue}: ${message.content.toString()}`);
            const oauth2 = new google.oauth.OAuth2(
                process.env.GOOGLE_CLIENT_ID!,
                process.env.GOOGLE_CLIENT_SECRET!
            )
            if (!account || !account.refresh_token) return
            oauth2.setCredentials({
                refresh_token: account.refresh_token
            })
            //logic for calling gmail api
            const gmail = google.gmail({version: 'v1', auth: oauth2})
            // get new emails for current user
            const res = await gmail.users.messages.list({
                userId: 'me',
                maxResults: 50,
                pageToken: messageData.pageToken
            })
            channel.ack(message);
        }
    });
}