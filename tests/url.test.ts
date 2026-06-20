import { expect, test } from "bun:test";
import { parseSourceUrl } from "../src/utils/url";

test("recognizes supported share urls", () => {
  expect(parseSourceUrl("https://chatgpt.com/share/foo")).toMatchObject({
    platform: "chatgpt",
  });
  expect(parseSourceUrl("https://chat.deepseek.com/s/abc123")).toMatchObject({
    platform: "deepseek",
    shareId: "abc123",
    url: "https://chat.deepseek.com/share/abc123",
  });
  expect(parseSourceUrl("https://g.co/gemini/share/gem123")).toMatchObject({
    platform: "gemini",
    shareId: "gem123",
    url: "https://gemini.google.com/share/gem123",
  });
});

test("returns null for unsupported urls or files", () => {
  expect(parseSourceUrl("https://example.com/share/foo")).toBeNull();
  expect(parseSourceUrl("./local.html")).toBeNull();
});
