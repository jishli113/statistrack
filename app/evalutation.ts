import Anthropic from '@anthropic-ai/sdk';

const anthropicClient = new Anthropic(
    {
        apiKey: process.env.CLAUDE_API_KEY,
    }
);
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

export const claudeResponse = async (email: string) => {
    consoleLog('evalutation.ts:claudeResponse', 'Claude request start', {
        emailLength: email.length,
        hasPrompt: Boolean(process.env.EMAIL_PARSE_PROMPT),
        maxTokens: Number(process.env.MAX_TOKENS || 0),
    }, 'E1');
    try {
        const response = await anthropicClient.messages.create({
            model: "claude-haiku-4-5-20251001",
            
            max_tokens:Number(process.env.MAX_TOKENS!),
            messages: [
                {
                    role:"user",
                    content: [
                        {
                            type: "text",
                            text: process.env.EMAIL_PARSE_PROMPT!.replace('{email}', email)
                        }
                    ]
                }
            ],
            temperature: 0.0,
            output_config: {
                format: {
                type: 'json_schema',
                schema: {
                    type: 'object',
                    properties: {
                    application: {type: 'string', description: 'If the email is related to a job application'},
                    type: {type: 'string', description: 'Type of email: application, interview, rejection, etc.'},
                    company: { type: 'string', description: 'Company name' },
                    job_title: { type: 'string', description: 'Specific job role (e.g., Software Engineer)' },
                    job_id: { type: 'string', description: 'Job ID or requisition number' },
                    location: { type: 'string', description: 'City, state/country (e.g., New York, NY)' },
                    },
                    required: ['company', 'job_title', 'job_id', 'location'],
                    additionalProperties: false,
                },
                },
            },
        });
        consoleLog('evalutation.ts:claudeResponse', 'Claude request success', {
            blocks: response.content.length,
            stopReason: response.stop_reason ?? null,
        }, 'E1');
        console.log("RETURNED")
        return response;
    } catch (error) {
        consoleLog('evalutation.ts:claudeResponse', 'Claude request failed', {
            errorName: error instanceof Error ? error.name : 'unknown',
            errorMessage: error instanceof Error ? error.message : 'unknown',
        }, 'E1');
        throw error;
    }
}