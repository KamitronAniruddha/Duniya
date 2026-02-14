'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting contextual tools
 * based on conversation history. It takes a list of messages as input and
 * suggests actions like summarizing or elaborating.
 *
 * - suggestContextualTools - The main function to call this AI flow.
 * - ContextualToolSuggestionInput - The input type for the flow.
 * - ContextualToolSuggestionOutput - The output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ConversationMessageSchema = z.object({
  sender: z.string().describe('The sender of the message (e.g., "user", "assistant").'),
  content: z.string().describe('The content of the message.'),
});

const ContextualToolSuggestionInputSchema = z.object({
  conversationHistory: z.array(ConversationMessageSchema).describe('The recent history of the conversation, ordered from oldest to newest.'),
});
export type ContextualToolSuggestionInput = z.infer<typeof ContextualToolSuggestionInputSchema>;

const SuggestedActionSchema = z.object({
  title: z.string().describe('A short, descriptive title for the suggested action (e.g., "Summarize", "Elaborate").'),
  description: z.string().describe('A brief explanation of what this action does.'),
  requiresKnowledgeRetrieval: z.boolean().describe('True if this action would likely benefit from external knowledge retrieval.'),
});

const ContextualToolSuggestionOutputSchema = z.object({
  suggestedActions: z.array(SuggestedActionSchema).describe('A list of suggested actions based on the conversation context.'),
});
export type ContextualToolSuggestionOutput = z.infer<typeof ContextualToolSuggestionOutputSchema>;

const contextualToolSuggestionPrompt = ai.definePrompt({
  name: 'contextualToolSuggestionPrompt',
  input: { schema: ContextualToolSuggestionInputSchema },
  output: { schema: ContextualToolSuggestionOutputSchema },
  prompt: `You are an AI assistant tasked with analyzing conversation history and proactively suggesting relevant actions or tools to the user. Your goal is to help the user perform useful tasks quickly within the chat.

Analyze the following conversation history and suggest up to 3 relevant actions. For each suggestion, provide a title, a description, and indicate whether the action would likely benefit from external knowledge retrieval.

Conversation History:
{{#each conversationHistory}}
{{sender}}: {{{content}}}
{{/each}}

Consider the current state of the conversation and what a user might want to do next. For example:
- If the conversation is long, suggest "Summarize".
- If a question was just asked, suggest "Elaborate" or "Find more information".
- If a specific topic was discussed, suggest "Deep dive on topic X".
- If a decision needs to be made, suggest "List pros and cons".

Your response must be a JSON object with a 'suggestedActions' key, which is an array of suggested actions. Each action must have a 'title', 'description', and 'requiresKnowledgeRetrieval' boolean.`,
});

const contextualToolSuggestionFlow = ai.defineFlow(
  {
    name: 'contextualToolSuggestionFlow',
    inputSchema: ContextualToolSuggestionInputSchema,
    outputSchema: ContextualToolSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await contextualToolSuggestionPrompt(input);
    if (!output) {
      throw new Error('Failed to generate contextual tool suggestions.');
    }
    return output;
  }
);

export async function suggestContextualTools(
  input: ContextualToolSuggestionInput
): Promise<ContextualToolSuggestionOutput> {
  return contextualToolSuggestionFlow(input);
}
