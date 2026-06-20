import type { ChatMessage, ChatParser, ChatRole } from "../types";

interface DeepseekFragment {
  type?: string;
  content?: string;
}

interface DeepseekMessage {
  message_id?: string | number;
  parent_id?: string | number | null;
  role?: string;
  fragments?: DeepseekFragment[];
  content?: string;
  inserted_at?: number;
}

interface DeepseekShareResponse {
  data?: {
    biz_data?: {
      messages?: DeepseekMessage[];
      chat_messages?: DeepseekMessage[];
      chat_session?: { history_messages?: DeepseekMessage[] } | null;
    } | null;
    chat_session?: { history_messages?: DeepseekMessage[] } | null;
    messages?: DeepseekMessage[];
  };
}

const ROLE_MAP: Record<string, ChatRole> = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "assistant",
};

const REASONING_TYPES = new Set(["THINK"]);
const TEXT_TYPES = new Set(["REQUEST", "RESPONSE"]);

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function normalizeText(content: unknown): string | null {
  if (typeof content !== "string") {
    return null;
  }
  const normalized = content.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

function hasRequiredRoles(messages: ChatMessage[]): boolean {
  return (
    messages.some((message) => message.role === "user") &&
    messages.some((message) => message.role === "assistant")
  );
}

export class DeepseekShareParser implements ChatParser {
  platform = "deepseek";

  canHandle(source: string, payload: unknown): boolean {
    try {
      return new URL(source).hostname.toLowerCase() === "chat.deepseek.com";
    } catch {
      return Boolean(
        payload &&
          typeof payload === "object" &&
          "data" in payload &&
          JSON.stringify(payload).includes("biz_data"),
      );
    }
  }

  parse(payload: unknown): ChatMessage[] {
    const messages = this.extractMessages(payload)
      .map((message) => this.transformMessage(message))
      .filter((message): message is ChatMessage => Boolean(message));

    if (!hasRequiredRoles(messages)) {
      throw new Error("内容必须至少包含一个问题和一个回答。");
    }

    return messages;
  }

  private extractMessages(payload: unknown): DeepseekMessage[] {
    if (!payload || typeof payload !== "object") {
      throw new Error("DeepSeek 分享响应格式无效。");
    }

    const root = payload as DeepseekShareResponse;
    const candidateArrays = [
      root.data?.biz_data?.messages,
      root.data?.biz_data?.chat_messages,
      root.data?.biz_data?.chat_session?.history_messages,
      root.data?.chat_session?.history_messages,
      root.data?.messages,
    ];

    for (const candidate of candidateArrays) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return candidate;
      }
    }

    throw new Error("DeepSeek 分享响应缺少对话内容。");
  }

  private transformMessage(message: DeepseekMessage): ChatMessage | null {
    const role = this.mapRole(message.role);
    if (!role) {
      return null;
    }

    const text = this.extractText(message);
    if (!text) {
      return null;
    }

    return {
      id: this.normalizeMessageId(message.message_id),
      role,
      text,
      metadata: {
        ...(message.message_id !== undefined
          ? { sourceMessageId: message.message_id }
          : {}),
        ...(message.parent_id !== undefined && message.parent_id !== null
          ? { parentId: message.parent_id }
          : {}),
        ...(typeof message.inserted_at === "number"
          ? { insertedAt: message.inserted_at }
          : {}),
      },
    };
  }

  private extractText(message: DeepseekMessage): string | null {
    const fragments = Array.isArray(message.fragments) ? message.fragments : [];
    const texts: string[] = [];
    const reasoning: string[] = [];

    for (const fragment of fragments) {
      const type = fragment.type?.toUpperCase() ?? "";
      const text = normalizeText(fragment.content);
      if (!text) {
        continue;
      }
      if (REASONING_TYPES.has(type)) {
        reasoning.push(text);
      }
      if (TEXT_TYPES.has(type)) {
        texts.push(text);
      }
    }

    if (texts.length > 0) {
      return [...reasoning.map((text) => `<reasoning>\n${text}\n</reasoning>`), ...texts].join("\n\n");
    }
    if (reasoning.length > 0) {
      return reasoning.join("\n\n");
    }
    return normalizeText(message.content);
  }

  private mapRole(role?: string | null): ChatRole | null {
    if (!role) {
      return null;
    }
    return ROLE_MAP[role.toUpperCase()] ?? null;
  }

  private normalizeMessageId(rawId?: string | number): string {
    return rawId === null || rawId === undefined ? randomId() : String(rawId);
  }
}
