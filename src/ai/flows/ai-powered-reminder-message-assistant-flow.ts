'use server';
/**
 * @fileOverview An AI assistant that suggests polite and personalized reminder messages for friends about outstanding debts.
 *
 * - aiPoweredReminderMessageAssistant - A function that handles the message generation process.
 * - AIPoweredReminderMessageAssistantInput - The input type for the aiPoweredReminderMessageAssistant function.
 * - AIPoweredReminderMessageAssistantOutput - The return type for the aiPoweredReminderMessageAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIPoweredReminderMessageAssistantInputSchema = z.object({
  friendName: z.string().describe('The name of the friend who owes money.'),
  debtAmount: z.string().describe('The amount of money owed, including currency (e.g., "5€").'),
  debtDescription: z
    .string()
    .describe('A brief description of the debt (e.g., "Cena", "Transporte").'),
  daysOverdue: z
    .number()
    .optional()
    .describe('Optional: The number of days the debt has been overdue.'),
});
export type AIPoweredReminderMessageAssistantInput = z.infer<
  typeof AIPoweredReminderMessageAssistantInputSchema
>;

const AIPoweredReminderMessageAssistantOutputSchema = z.object({
  suggestedMessage: z.string().describe('A polite and personalized reminder message.'),
});
export type AIPoweredReminderMessageAssistantOutput = z.infer<
  typeof AIPoweredReminderMessageAssistantOutputSchema
>;

export async function aiPoweredReminderMessageAssistant(
  input: AIPoweredReminderMessageAssistantInput
): Promise<AIPoweredReminderMessageAssistantOutput> {
  return aiPoweredReminderMessageAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiPoweredReminderMessageAssistantPrompt',
  input: {schema: AIPoweredReminderMessageAssistantInputSchema},
  output: {schema: AIPoweredReminderMessageAssistantOutputSchema},
  prompt: `You are a helpful assistant that generates polite and personalized reminder messages for friends about outstanding debts.
The message should be gentle, friendly, and encourage the friend to pay back without being demanding.

Debt Details:
Friend's Name: {{{friendName}}}
Amount Owed: {{{debtAmount}}}
Description: {{{debtDescription}}}
{{#if daysOverdue}}
This debt is {{{daysOverdue}}} days overdue.
{{/if}}

Please suggest a polite reminder message.`,
});

const aiPoweredReminderMessageAssistantFlow = ai.defineFlow(
  {
    name: 'aiPoweredReminderMessageAssistantFlow',
    inputSchema: AIPoweredReminderMessageAssistantInputSchema,
    outputSchema: AIPoweredReminderMessageAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
