import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {redisMQueue} from "@/app/connection"

export async function POST(request: Request) {
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
        let tokenTrack = 0;
        while (true) {
            const users = await prisma.user.findMany({
                select:{
                    id:true,
                },
                skip: tokenTrack,
                take: 100
            });
            tokenTrack += 100;
            await Promise.all(users.map(user => {
                const payload = JSON.stringify({
                    userId: user.id
                });
                return redisMQueue.sendMessage(payload, 1000) 
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
