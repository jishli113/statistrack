import { consumeMessage } from "./consumer"
// #region agent log
fetch("http://127.0.0.1:7645/ingest/dd7520f7-f070-4459-993e-c235e8ec3533", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e049c2" },
    body: JSON.stringify({
        sessionId: "e049c2",
        location: "worker.js:startup",
        message: "worker env snapshot",
        data: {
            hasRabbitUrl: Boolean(process.env.RABBITMQ_URL),
            hypothesisId: "C",
        },
        timestamp: Date.now(),
        runId: "pre-fix",
    }),
}).catch(() => {});
// #endregion
const worker = async() => {
    await consumeMessage(process.env.RABBITMQ_GMAIL_API_QUEUE)
}

worker();