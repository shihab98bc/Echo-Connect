// Communication Summary Genkit Flow
'use server';

/**
 * @fileOverview Generates a summary of recent communications for a user.
 *
 * - generateCommunicationSummary - A function that generates the summary.
 * - CommunicationSummaryInput - The input type for the generateCommunicationSummary function.
 * - CommunicationSummaryOutput - The return type for the generateCommunicationSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CommunicationSummaryInputSchema = z.object({
  userId: z.string().describe('The ID of the user for whom to summarize communications.'),
  recentMessages: z.array(z.string()).describe('An array of recent messages for the user.'),
});
export type CommunicationSummaryInput = z.infer<typeof CommunicationSummaryInputSchema>;

const CommunicationSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the user\'s recent communications.'),
});
export type CommunicationSummaryOutput = z.infer<typeof CommunicationSummaryOutputSchema>;

export async function generateCommunicationSummary(input: CommunicationSummaryInput): Promise<CommunicationSummaryOutput> {
  return communicationSummaryFlow(input);
}

const communicationSummaryPrompt = ai.definePrompt({
  name: 'communicationSummaryPrompt',
  input: {schema: CommunicationSummaryInputSchema},
  output: {schema: CommunicationSummaryOutputSchema},
  prompt: `You are an AI assistant that summarizes recent communications for a user.

  Summarize the following messages:

  {{#each recentMessages}}
  - {{{this}}}
  {{/each}}
  `,
});

const communicationSummaryFlow = ai.defineFlow(
  {
    name: 'communicationSummaryFlow',
    inputSchema: CommunicationSummaryInputSchema,
    outputSchema: CommunicationSummaryOutputSchema,
  },
  async input => {
    const {output} = await communicationSummaryPrompt(input);
    return output!;
  }
);
