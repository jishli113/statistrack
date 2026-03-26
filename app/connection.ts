import amqp from "amqplib";

export const connectRabbitMQ = async () => {
    try {
        // #region agent log
        const _u = process.env.RABBITMQ_URL;
        let _proto = "missing";
        if (_u) {
            try {
                _proto = new URL(_u).protocol;
            } catch {
                _proto = "invalid-url";
            }
        }
        fetch("http://127.0.0.1:7645/ingest/dd7520f7-f070-4459-993e-c235e8ec3533", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e049c2" },
            body: JSON.stringify({
                sessionId: "e049c2",
                location: "connection.ts:connectRabbitMQ",
                message: "RABBITMQ_URL scheme before connect",
                data: { protocol: _proto, hasUrl: Boolean(_u), hypothesisId: "A" },
                timestamp: Date.now(),
                runId: "post-fix",
            }),
        }).catch(() => {});
        // #endregion
        const connection = await amqp.connect(process.env.RABBITMQ_URL!);
        const channel = await connection.createChannel();
        // #region agent log
        fetch("http://127.0.0.1:7645/ingest/dd7520f7-f070-4459-993e-c235e8ec3533", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e049c2" },
            body: JSON.stringify({
                sessionId: "e049c2",
                location: "connection.ts:connectRabbitMQ",
                message: "RabbitMQ connect ok",
                data: { ok: true, hypothesisId: "A" },
                timestamp: Date.now(),
                runId: "post-fix",
            }),
        }).catch(() => {});
        // #endregion
        console.log("Connected to RabbitMQ");
        return {connection, channel};
    } catch (error) {
        console.error("Error connecting to RabbitMQ", error);
        throw error;
    }
}