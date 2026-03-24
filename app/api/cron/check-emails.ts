import { prisma } from '@/lib/prisma'
import {connect} from "amqplib"
import {connectRabbitMQ} from "@/app/connection"

const sendMessage = async(queue:string, message:string) => {
    const {channel} = await connectRabbitMQ();
    await channel.assertQueue(queue, {durable: true});
    channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Message sent to ${queue}: ${message}`);
}

export async function POST(request: Request) {
    try {
        const queue = process.env.RABBITMQ_GMAIL_API_QUEUE!;
        let tokenTrack = 0;
        while (true) {
            const users = await prisma.user.findMany({
                select:{
                    id:true,
                    gmailToken:true,
                },
                skip: tokenTrack,
                take: 100
            });
            tokenTrack += 100;
            //logic for enqueueing tasks/calling gmail api
            const promises = users.map(user => {
                const payload = JSON.stringify({
                    userId: user.id,
                    gmailToken: user.gmailToken
                });
                sendMessage(queue, payload)
            });
            await Promise.all(promises);
            if (users.length < 100) {
                break;
            }
        }
    }
    catch (error) {
        console.error("Error in check-emails", error);
    }
}

