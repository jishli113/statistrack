import {Queue} from '@upstash/queue'
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

// #region agent log
fetch('http://127.0.0.1:7645/ingest/dd7520f7-f070-4459-993e-c235e8ec3533', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '22dd7a' },
  body: JSON.stringify({
    sessionId: '22dd7a',
    location: 'connection.ts:module-load',
    message: 'Upstash Redis env presence',
    data: {
      hasUrl: Boolean(upstashUrl),
      hasToken: Boolean(upstashToken),
      hypothesisId: 'H1',
    },
    timestamp: Date.now(),
    runId: 'post-fix',
  }),
}).catch(() => {})
// #endregion

const redis = new Redis({
    url: upstashUrl,
    token: upstashToken,
})
const redisMQueue = new Queue({
  queueName: 'gmail_update_queue',
  redis,
  concurrencyLimit: 1,
})
export function createGmailReceiveQueue() {
  return new Queue({
    queueName: 'gmail_update_queue',
    redis,
    concurrencyLimit: 1,
  })
}

const redisRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "20 s")
})

export { redisMQueue, redisRateLimit }