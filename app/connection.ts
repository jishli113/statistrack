import {Queue} from '@upstash/queue'
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN

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
