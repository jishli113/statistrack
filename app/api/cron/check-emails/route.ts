import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import {redisMQueue} from "@/app/connection"

const consoleLog = (location: string, message: string, data: Record<string, unknown>, hypothesisId: string) => {
    console.log('[cron-debug]', {
        sessionId: '22dd7a',
        runId: 'cron-debug',
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
    });
}

export async function POST(request: Request) {
    consoleLog('check-emails/route.ts:POST', 'Cron endpoint invoked', {
        hasAuthorizationHeader: Boolean(request.headers.get('Authorization')),
        hasCronSecret: Boolean(process.env.CRON_SECRET),
    }, 'C1');
    if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        consoleLog('check-emails/route.ts:POST', 'Cron auth failed', {}, 'C1');
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
            consoleLog('check-emails/route.ts:POST', 'Fetched users batch', {
                batchSize: users.length,
                tokenTrack,
            }, 'C3');
            tokenTrack += 100;
            //logic for enqueueing tasks/calling gmail api
            await Promise.all(users.map(user => {
                const payload = JSON.stringify({
                    userId: user.id
                });
                //delay in milliseconds
                return redisMQueue.sendMessage(payload, 1000) 
            }));
            if (users.length < 100) {
                break;
            }
        }
        consoleLog('check-emails/route.ts:POST', 'Cron endpoint completed', { totalProcessed: tokenTrack }, 'C3');
        return NextResponse.json({ ok: true }, { status: 200 })
    }
    catch (error) {
        consoleLog('check-emails/route.ts:POST', 'Cron endpoint failed', {
            errorName: error instanceof Error ? error.name : 'unknown',
            errorMessage: error instanceof Error ? error.message : 'unknown',
        }, 'C4');
        console.error("Error in check-emails", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

