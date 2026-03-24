import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
            // Add logic for enqueueing tasks/calling gmail api
            const promises = users.map(user => sendMessage("gmail_api", user.gmailToken!));
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

