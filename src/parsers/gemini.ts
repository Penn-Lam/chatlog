import type { ChatMessage, ChatParser } from "../types";

export interface GeminiShareSnapshotPayload {
  shareUrl: string;
  at?: string | null;
  bl?: string | null;
  fSid?: string | null;
  cookies?: Record<string, string> | null;
  batchexecute: string;
  shareHtml?: string;
  meta?: Record<string, unknown>;
}

function randomId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function decodeToken(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value
    .trim()
    .replace(/\\\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\\\x([0-9a-fA-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
}

export function extractAtFromShareHtml(html: string): string | null {
  const patterns = [
    /<input[^>]+name=["']SNlM0e["'][^>]+value=["']([^"']+)["']/i,
    /<input[^>]+value=["']([^"']+)["'][^>]+name=["']SNlM0e["']/i,
    /"SNlM0e"\s*:\s*"([^"]+)"/,
    /'SNlM0e'\s*:\s*'([^']+)'/,
    /"SNlM0e"\s*,\s*"([^"]+)"/,
    /\["SNlM0e","([^"]+)"/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const decoded = decodeToken(match?.[1]);
    if (decoded) {
      return decoded;
    }
  }
  return null;
}

export function extractGeminiSessionParamsFromShareHtml(html: string): {
  bl: string | null;
  fSid: string | null;
} {
  const bl =
    /"cfb2h"\s*:\s*"([^"]+)"/.exec(html)?.[1] ??
    /cfb2h["'\]\s:=]+(?:"([^"]+)"|'([^']+)')/.exec(html)?.[1] ??
    /cfb2h["'\]\s:=]+(?:"([^"]+)"|'([^']+)')/.exec(html)?.[2] ??
    null;
  const fSid =
    /"FdrFJe"\s*:\s*"([^"]+)"/.exec(html)?.[1] ??
    /FdrFJe["'\]\s:=]+(?:"([^"]+)"|'([^']+)')/.exec(html)?.[1] ??
    /FdrFJe["'\]\s:=]+(?:"([^"]+)"|'([^']+)')/.exec(html)?.[2] ??
    null;
  return { bl, fSid };
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.replace(/\r\n/g, "\n").trim();
  return text.length > 0 ? text : null;
}

function parseLengthPrefixedBlocks(rawText: string): unknown[] | null {
  const text = rawText.replace(/^\)\]\}'\s*/u, "");
  let cursor = 0;
  const blocks: unknown[] = [];
  while (cursor < text.length) {
    while (cursor < text.length && /\s/u.test(text[cursor] ?? "")) {
      cursor += 1;
    }
    if (cursor >= text.length) {
      break;
    }
    const lengthMatch = /^(\d+)\s*\n/u.exec(text.slice(cursor));
    if (!lengthMatch) {
      return null;
    }
    const length = Number.parseInt(lengthMatch[1] ?? "", 10);
    cursor += lengthMatch[0].length;
    const chunk = text.slice(cursor, cursor + length);
    cursor += length;
    try {
      blocks.push(JSON.parse(chunk));
    } catch {
      return null;
    }
  }
  return blocks.length > 0 ? blocks : null;
}

function sliceFirstJsonValue(text: string): string | null {
  const start = text.search(/[\[{]/u);
  if (start === -1) {
    return null;
  }
  const stack = [text[start]];
  let inString = false;
  let escaped = false;
  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }
    if (char === "\"") {
      inString = true;
    } else if (char === "{" || char === "[") {
      stack.push(char);
    } else if (char === "}" || char === "]") {
      const last = stack.pop();
      const expected = last === "{" ? "}" : last === "[" ? "]" : null;
      if (!expected || char !== expected) {
        return null;
      }
      if (stack.length === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return null;
}

function collectJsonStringCandidates(root: unknown, limit = 50): string[] {
  const queue = [root];
  const results: string[] = [];
  while (queue.length > 0 && results.length < limit) {
    const current = queue.shift();
    if (typeof current === "string") {
      const trimmed = current.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        results.push(trimmed);
      }
    } else if (Array.isArray(current)) {
      queue.push(...current);
    } else if (current && typeof current === "object") {
      queue.push(...Object.values(current));
    }
  }
  return results;
}

export function parseGeminiBatchexecute(rawText: string): unknown {
  let outer: unknown;
  const blocks = parseLengthPrefixedBlocks(rawText);
  if (blocks) {
    outer = blocks;
  } else {
    const jsonText = sliceFirstJsonValue(rawText.replace(/^\)\]\}'\s*/u, ""));
    if (!jsonText) {
      throw new Error("Gemini batchexecute 响应格式异常。");
    }
    outer = JSON.parse(jsonText);
  }

  for (const candidate of collectJsonStringCandidates(outer)) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        Array.isArray(parsed) &&
        (Array.isArray(parsed[1]) ||
          (Array.isArray(parsed[0]) && Array.isArray(parsed[0][1])))
      ) {
        return parsed;
      }
    } catch {
      // Continue scanning nested candidates.
    }
  }

  throw new Error("Gemini batchexecute 响应缺少对话数据。");
}

function readPath(value: unknown, path: number[]): unknown {
  let current = value;
  for (const index of path) {
    if (!Array.isArray(current) || index < 0 || index >= current.length) {
      return undefined;
    }
    current = current[index];
  }
  return current;
}

export class GeminiShareParser implements ChatParser {
  platform = "gemini";

  canHandle(source: string, payload: unknown): boolean {
    try {
      const host = new URL(source).hostname.toLowerCase();
      return host === "gemini.google.com" || host === "g.co";
    } catch {
      return Boolean(
        payload &&
          typeof payload === "object" &&
          "batchexecute" in payload,
      );
    }
  }

  parse(payload: unknown): ChatMessage[] {
    if (!payload || typeof payload !== "object") {
      throw new Error("Gemini 分享响应格式无效。");
    }
    const snapshot = payload as Partial<GeminiShareSnapshotPayload>;
    if (typeof snapshot.batchexecute !== "string") {
      throw new Error("Gemini 分享响应缺少 batchexecute 原始数据。");
    }

    const conversationData = parseGeminiBatchexecute(snapshot.batchexecute);
    const turns = [readPath(conversationData, [1]), readPath(conversationData, [0, 1])].find(
      (candidate): candidate is unknown[] =>
        Array.isArray(candidate) && candidate.length > 0,
    );
    if (!turns) {
      throw new Error("Gemini 分享响应缺少对话内容。");
    }

    const messages: ChatMessage[] = [];
    for (const turn of turns) {
      const user = normalizeText(readPath(turn, [2, 0, 0]));
      const assistant = normalizeText(readPath(turn, [3, 0, 0, 1, 0]));
      if (user) {
        messages.push({ id: randomId(), role: "user", text: user });
      }
      if (assistant) {
        messages.push({ id: randomId(), role: "assistant", text: assistant });
      }
    }

    if (
      !messages.some((message) => message.role === "user") ||
      !messages.some((message) => message.role === "assistant")
    ) {
      throw new Error("内容必须至少包含一个问题和一个回答。");
    }
    return messages;
  }
}
