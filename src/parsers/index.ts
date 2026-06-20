import type { ChatParser } from "../types";
import { ChatGptShareParser } from "./chatgpt";
import { DeepseekShareParser } from "./deepseek";
import { GeminiShareParser } from "./gemini";

export const parsers: ChatParser[] = [
  new ChatGptShareParser(),
  new DeepseekShareParser(),
  new GeminiShareParser(),
];

export function findParser(source: string, payload: unknown): ChatParser {
  const parser = parsers.find((candidate) =>
    candidate.canHandle(source, payload),
  );
  if (!parser) {
    throw new Error("未找到可处理该聊天记录来源的解析器。");
  }
  return parser;
}
