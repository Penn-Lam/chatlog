export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface ChatExport {
  source: string;
  platform: string;
  exportedAt: string;
  messageCount: number;
  roleCounts: Record<ChatRole, number>;
  messages: Array<ChatMessage & { index: number }>;
}

export interface ChatParser {
  platform: string;
  canHandle(source: string, payload: unknown): boolean;
  parse(payload: unknown): ChatMessage[];
}
