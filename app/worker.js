import 'dotenv/config'
import { consumeMessage } from './consumer'

// #region agent log
fetch('http://127.0.0.1:7645/ingest/dd7520f7-f070-4459-993e-c235e8ec3533', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '22dd7a' },
  body: JSON.stringify({
    sessionId: '22dd7a',
    location: 'worker.js:after-dotenv',
    message: 'worker env snapshot (no secrets)',
    data: {
      hasUpstashUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      hasUpstashToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
      hypothesisId: 'H1',
    },
    timestamp: Date.now(),
    runId: 'post-fix',
  }),
}).catch(() => {})
// #endregion

const worker = async () => {
  await consumeMessage()
}

worker()
