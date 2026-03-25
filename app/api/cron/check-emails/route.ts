import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {connectRabbitMQ} from "@/app/connection"

const sendMessage = async(queue:string, message:string) => {
    const {channel} = await connectRabbitMQ();
    await channel.assertQueue(queue, {durable: true});
    channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Message sent to ${queue}: ${message}`);
}
export async function GET(request: Request) {
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return await dequeue();
}

async function dequeue() {
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
            const promises = await Promise.all(users.map(user => {
                const payload = JSON.stringify({
                    userId: user.id
                });
                return sendMessage(queue, payload)
            }));
            if (users.length < 100) {
                break;
            }
        }
        return NextResponse.json({ ok: true }, { status: 200 })
    }
    catch (error) {
        console.error("Error in check-emails", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

