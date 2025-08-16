'use server';

import { generateCommunicationSummary } from '@/ai/flows/communication-summary';
// import { mockMessages } from '@/lib/mock-data';

export async function summarizeUserActivity(userId: string) {
  // In a real app, you would fetch the user's recent messages from a database.
  // This is currently disabled as we move to firestore.
  const recentMessages: string[] = [];

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
