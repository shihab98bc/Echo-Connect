'use server';

import { generateCommunicationSummary } from '@/ai/flows/communication-summary';
import { mockMessages } from '@/lib/mock-data';

export async function summarizeUserActivity(userId: string) {
  // In a real app, you would fetch the user's recent messages from a database.
  // Here, we'll use mock data for demonstration.
  const allMessages = Object.values(mockMessages).flat();
  const recentMessages = allMessages
    .filter(msg => msg.sender === userId || allMessages.some(m => m.sender === userId))
    .slice(-10) // Get last 10 messages for context
    .map(msg => msg.text);

  if (recentMessages.length === 0) {
    return { summary: "No recent activity to summarize." };
  }

  try {
    const result = await generateCommunicationSummary({
      userId,
      recentMessages,
    });
    return result;
  } catch (error) {
    console.error('Error generating communication summary:', error);
    // Return a structured error or re-throw
    throw new Error('Failed to generate summary.');
  }
}
