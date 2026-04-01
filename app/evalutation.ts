import Anthropic from '@anthropic-ai/sdk';

const anthropicClient = new Anthropic(
    {
        apiKey: process.env.CLAUDE_API_KEY,
    }
);

export const claudeResponse = async (email: string) => {
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
        return response;
    } catch (error) {
        console.error('Claude request failed', error instanceof Error ? error.message : error)
        throw error;
    }
}
