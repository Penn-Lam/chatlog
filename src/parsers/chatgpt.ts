import { runInNewContext } from "node:vm";
import type { ChatMessage, ChatParser, ChatRole } from "../types";

const CHATGPT_HOST_SUFFIX = "chatgpt.com";
const STREAM_MARKER = "window.__reactRouterContext.streamController.enqueue(";
const MAX_DEPTH = 500;
const SKIPPED_KEYS = new Set(["weight"]);

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeReactStreamChunk(chunk: string): string {
  const trimmed = chunk.trim();
  const bracketIndex = trimmed.search(/[\[{]/);
  return bracketIndex > 0 ? trimmed.slice(bracketIndex) : trimmed;
}

function mapRole(role: string): ChatRole | null {
  if (role === "user") {
    return "user";
  }
  if (role === "assistant" || role === "system") {
    return "assistant";
  }
  return null;
}

function hasRequiredRoles(messages: ChatMessage[]): boolean {
  return (
    messages.length >= 2 &&
    messages.some((message) => message.role === "user") &&
    messages.some((message) => message.role === "assistant")
  );
}

function normalizeParts(parts: unknown[]): string {
  const texts: string[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      const text = part.trim();
      if (text) {
        texts.push(text);
      }
    } else if (part && typeof part === "object") {
      const candidate = part as Record<string, unknown>;
      const value = candidate.text ?? candidate.value;
      if (value !== undefined) {
        const text = String(value).trim();
        if (text) {
          texts.push(text);
        }
      }
    }
  }

  return texts.join("\n\n");
}

function resolveFlightValue(
  data: unknown[],
  value: unknown,
  cache: Map<number, unknown>,
  depth = 0,
  visiting = new Set<number>(),
): unknown {
  if (depth > MAX_DEPTH || value === null || value === undefined) {
    return value;
  }

  if (typeof value === "number") {
    if (value >= 0 && value < data.length) {
      if (cache.has(value)) {
        return cache.get(value);
      }
      if (visiting.has(value)) {
        return undefined;
      }

      visiting.add(value);
      try {
        const resolved = resolveFlightValue(
          data,
          data[value],
          cache,
          depth + 1,
          visiting,
        );
        cache.set(value, resolved);
        return resolved;
      } finally {
        visiting.delete(value);
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveFlightValue(data, item, cache, depth + 1, visiting),
    );
  }

  if (typeof value !== "object") {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key.startsWith("_")) {
      const keyIndex = Number.parseInt(key.slice(1), 10);
      if (!Number.isNaN(keyIndex) && keyIndex >= 0 && keyIndex < data.length) {
        const keyName = resolveFlightValue(
          data,
          data[keyIndex],
          cache,
          depth + 1,
          visiting,
        );
        if (typeof keyName === "string" && !SKIPPED_KEYS.has(keyName)) {
          result[keyName] = resolveFlightValue(
            data,
            item,
            cache,
            depth + 1,
            visiting,
          );
        }
      }
    } else if (!SKIPPED_KEYS.has(key)) {
      result[key] = resolveFlightValue(
        data,
        item,
        cache,
        depth + 1,
        visiting,
      );
    }
  }

  return result;
}

function isVisibleMessage(candidate: unknown): boolean {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const message = candidate as Record<string, any>;
  const metadata = message.metadata ?? {};
  return (
    Boolean(message.id) &&
    Boolean(message.author?.role) &&
    Array.isArray(message.content?.parts) &&
    !metadata.is_visually_hidden_from_conversation &&
    !metadata.is_redacted
  );
}

function collectAllMessages(
  node: unknown,
  collected: Map<string, any>,
  visited: WeakSet<object> = new WeakSet<object>(),
  depth = 0,
) {
  if (depth > MAX_DEPTH || !node || typeof node !== "object") {
    return;
  }
  if (visited.has(node)) {
    return;
  }
  visited.add(node);

  const candidate = (node as any).message ?? node;
  if (isVisibleMessage(candidate)) {
    collected.set(candidate.id, candidate);
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectAllMessages(item, collected, visited, depth + 1);
    }
    return;
  }

  for (const value of Object.values(node)) {
    collectAllMessages(value, collected, visited, depth + 1);
  }
}

function extractConversationMapping(
  payload: unknown[],
  cache: Map<number, unknown>,
): Record<string, unknown> | null {
  for (let i = 0; i < payload.length - 1; i += 1) {
    if (payload[i] !== "mapping") {
      continue;
    }

    const candidate = resolveFlightValue(payload, payload[i + 1], cache);
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      const values = Object.values(candidate);
      const hasMessage = values.some((node: any) =>
        Boolean(node?.message?.author?.role && node?.message?.content?.parts),
      );
      if (hasMessage) {
        return candidate as Record<string, unknown>;
      }
    }
  }

  return null;
}

function resolveMappedConversationNode(
  node: any,
  mapping: Record<string, unknown> | null,
): unknown | null {
  const candidate = node?.message ?? node;
  if (isVisibleMessage(candidate)) {
    return node;
  }
  if (!mapping || !node || typeof node !== "object") {
    return null;
  }

  const visitedIds = new Set<string>();
  const queue: unknown[] = [];
  const enqueueId = (id: unknown) => {
    if (typeof id !== "string" || visitedIds.has(id)) {
      return;
    }
    const mappedNode = mapping[id];
    if (mappedNode && typeof mappedNode === "object") {
      visitedIds.add(id);
      queue.push(mappedNode);
    }
  };

  enqueueId(node.id);
  if (queue.length === 0 && Array.isArray(node.children)) {
    for (const child of node.children) {
      enqueueId(child);
    }
  }

  while (queue.length > 0) {
    const current: any = queue.shift();
    if (isVisibleMessage(current?.message ?? current)) {
      return current;
    }
    if (Array.isArray(current?.children)) {
      for (const child of current.children) {
        enqueueId(child);
      }
    }
  }

  return null;
}

function collectLinearConversationRefs(
  payload: unknown[],
  collected: Map<string, any>,
  cache: Map<number, unknown>,
  visited: WeakSet<object>,
  orderIndex: Map<string, number>,
) {
  const linearConversationIndex = payload.indexOf("linear_conversation");
  if (
    linearConversationIndex === -1 ||
    linearConversationIndex + 1 >= payload.length
  ) {
    return;
  }

  const messageRefs = payload[linearConversationIndex + 1];
  if (!Array.isArray(messageRefs)) {
    return;
  }

  const mapping = extractConversationMapping(payload, cache);

  for (const ref of messageRefs) {
    if (typeof ref !== "number" || ref < 0 || ref >= payload.length) {
      continue;
    }

    const messageNode = resolveFlightValue(payload, ref, cache);
    const resolvedNode =
      resolveMappedConversationNode(messageNode, mapping) ?? messageNode;
    const message = (resolvedNode as any)?.message ?? resolvedNode;
    const messageId = typeof message?.id === "string" ? message.id : null;

    if (messageId && !orderIndex.has(messageId)) {
      orderIndex.set(messageId, orderIndex.size);
    }
    collectAllMessages(resolvedNode, collected, visited);
  }
}

function toMessages(
  collected: Map<string, any>,
  orderIndex = new Map<string, number>(),
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const message of collected.values()) {
    const role = mapRole(message?.author?.role ?? "");
    const text = normalizeParts(message?.content?.parts ?? []);
    if (!role || !text) {
      continue;
    }

    messages.push({
      id: message.id,
      role,
      text,
      metadata: {
        ...(message.create_time ? { createTime: message.create_time } : {}),
      },
    });
  }

  return messages.sort((a, b) => {
      const orderA = orderIndex.get(a.id) ?? Number.POSITIVE_INFINITY;
      const orderB = orderIndex.get(b.id) ?? Number.POSITIVE_INFINITY;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const timeA = Number(a.metadata?.createTime ?? 0);
      const timeB = Number(b.metadata?.createTime ?? 0);
      return timeA - timeB;
    });
}

function extractFromReactRouterStream(html: string): ChatMessage[] {
  const collected = new Map<string, any>();
  const orderIndex = new Map<string, number>();
  const visited = new WeakSet<object>();
  let pos = 0;

  while (true) {
    const idx = html.indexOf(STREAM_MARKER, pos);
    if (idx === -1) {
      break;
    }

    const startArg = idx + STREAM_MARKER.length;
    const quote = html[startArg];
    if (quote !== "\"" && quote !== "'" && quote !== "`") {
      pos = startArg;
      continue;
    }

    let endArg = -1;
    for (let i = startArg + 1; i < html.length; i += 1) {
      if (html[i] === "\\") {
        i += 1;
        continue;
      }
      if (html[i] === quote) {
        const next = html.substring(i + 1).trimStart();
        if (next.startsWith(");")) {
          endArg = i + 1;
          break;
        }
      }
    }

    if (endArg === -1) {
      pos = startArg;
      continue;
    }

    const literal = html.substring(startArg, endArg);
    pos = endArg;

    let chunkText: string;
    try {
      chunkText = runInNewContext(literal);
    } catch {
      continue;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(normalizeReactStreamChunk(chunkText));
    } catch {
      continue;
    }

    if (Array.isArray(payload)) {
      const cache = new Map<number, unknown>();
      collectLinearConversationRefs(
        payload,
        collected,
        cache,
        visited,
        orderIndex,
      );
      if (collected.size < 4) {
        collectAllMessages(resolveFlightValue(payload, payload, cache), collected, visited);
      }
    } else {
      collectAllMessages(payload, collected, visited);
    }
  }

  return toMessages(collected, orderIndex);
}

function extractFromDom(html: string): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const pattern =
    /<[^>]+data-message-author-role=["']([^"']+)["'][^>]*>([\s\S]*?)(?=<[^>]+data-message-author-role=["']|<\/main>|<\/body>|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const role = mapRole(match[1].toLowerCase());
    if (!role) {
      continue;
    }
    const text = normalizeWhitespace(
      match[2]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'"),
    );
    if (text) {
      messages.push({
        id: `dom-${messages.length + 1}`,
        role,
        text,
      });
    }
  }

  return messages;
}

export class ChatGptShareParser implements ChatParser {
  platform = "chatgpt";

  canHandle(source: string, html: unknown): boolean {
    try {
      const target = new URL(source);
      const hostname = target.hostname.toLowerCase();
      return (
        (hostname === CHATGPT_HOST_SUFFIX ||
          hostname.endsWith(`.${CHATGPT_HOST_SUFFIX}`)) &&
        target.pathname.includes("/share/")
      );
    } catch {
      return (
        typeof html === "string" &&
        (html.includes("chatgpt.com") ||
          html.includes(STREAM_MARKER) ||
          html.includes("data-message-author-role"))
      );
    }
  }

  parse(html: unknown): ChatMessage[] {
    if (typeof html !== "string") {
      throw new Error("ChatGPT parser 需要 HTML 字符串输入。");
    }
    const streamMessages = extractFromReactRouterStream(html);
    if (hasRequiredRoles(streamMessages)) {
      return streamMessages;
    }

    const domMessages = extractFromDom(html);
    if (hasRequiredRoles(domMessages)) {
      return domMessages;
    }

    if (streamMessages.length >= 2) {
      return streamMessages.map((message, index) => ({
        ...message,
        role: index % 2 === 0 ? "user" : "assistant",
      }));
    }

    throw new Error("未能从 ChatGPT 分享页中解析出有效的问答消息。");
  }
}
