import { expect, test } from "bun:test";
import { createExport, formatMarkdown, inferFormat } from "../src/format";

test("creates normalized export data", () => {
  const data = createExport("source", "chatgpt", [
    { id: "u1", role: "user", text: "你好" },
    { id: "a1", role: "assistant", text: "你好，有什么可以帮你？" },
  ]);

  expect(data.messageCount).toBe(2);
  expect(data.roleCounts).toEqual({ user: 1, assistant: 1 });
  expect(data.messages[0].index).toBe(1);
});

test("formats markdown output", () => {
  const data = createExport("source", "chatgpt", [
    { id: "u1", role: "user", text: "你好" },
    { id: "a1", role: "assistant", text: "你好，有什么可以帮你？" },
  ]);

  const markdown = formatMarkdown(data);

  expect(markdown).toContain("# 聊天记录导出");
  expect(markdown).toContain("<user_1>");
  expect(markdown).toContain("</user_1>");
  expect(markdown).toContain("<assistant_2>");
  expect(markdown).toContain("</assistant_2>");
  expect(markdown).not.toContain("## 1. user");
});

test("infers output format", () => {
  expect(inferFormat(undefined, "chat.md")).toBe("md");
  expect(inferFormat(undefined, "chat.json")).toBe("json");
  expect(inferFormat("markdown", undefined)).toBe("md");
});
