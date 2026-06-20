import type { ChatExport, ChatMessage, ChatRole } from "./types";

function roleCounts(messages: ChatMessage[]): Record<ChatRole, number> {
  return messages.reduce<Record<ChatRole, number>>(
    (acc, message) => {
      acc[message.role] += 1;
      return acc;
    },
    { user: 0, assistant: 0 },
  );
}

export function createExport(
  source: string,
  platform: string,
  messages: ChatMessage[],
): ChatExport {
  return {
    source,
    platform,
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    roleCounts: roleCounts(messages),
    messages: messages.map((message, index) => ({
      index: index + 1,
      ...message,
    })),
  };
}

export function formatJson(data: ChatExport): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function formatMarkdown(data: ChatExport): string {
  const lines = [
    "# 聊天记录导出",
    "",
    `- 来源：${data.source}`,
    `- 平台：${data.platform}`,
    `- 导出时间：${data.exportedAt}`,
    `- 消息数：${data.messageCount}`,
    `- 角色统计：user ${data.roleCounts.user} / assistant ${data.roleCounts.assistant}`,
    "",
  ];

  for (const message of data.messages) {
    const tag = `${message.role}_${message.index}`;
    lines.push(`<${tag}>`, "", message.text, "", `</${tag}>`, "");
  }

  return lines.join("\n");
}

export function inferFormat(
  explicit: string | undefined,
  outPath: string | undefined,
): "json" | "md" {
  if (explicit === "json" || explicit === "md" || explicit === "markdown") {
    return explicit === "markdown" ? "md" : explicit;
  }
  if (explicit) {
    throw new Error("--format 仅支持 json 或 md。");
  }
  if (outPath?.toLowerCase().endsWith(".md")) {
    return "md";
  }
  return "json";
}

export function formatExport(data: ChatExport, format: "json" | "md"): string {
  return format === "md" ? formatMarkdown(data) : formatJson(data);
}
