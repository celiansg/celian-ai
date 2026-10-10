export interface ConversationMemory {
  conversationId: string;
  summary: string;
  recentMessageCount: number;
}

export async function getConversationMemory(conversationId: string): Promise<ConversationMemory> {
  return { conversationId, summary: "Mémoire de conversation prête à être branchée à Supabase.", recentMessageCount: 0 };
}
