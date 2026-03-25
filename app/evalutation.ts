import Anthropic from '@anthropic-ai/sdk';

const anthropicClient = new Anthropic({});
export const claudeResponse = async () => {return anthropicClient.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens:Number(process.env.MAX_TOKENS!),
    messages: [
        {
            role:"user",
            content: [
                {
                    type: "text",
                    text: process.env.EMAIL_PARSE_PROMPT!
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
})}