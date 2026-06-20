import { expect, test } from "bun:test";
import { ChatGptShareParser } from "../src/parsers/chatgpt";

function createStreamHtml(payload: unknown[]): string {
  const chunk = JSON.stringify(payload);
  const escaped = chunk.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `
    <html>
      <script>
        window.__reactRouterContext = window.__reactRouterContext || {};
        window.__reactRouterContext.streamController = window.__reactRouterContext.streamController || {};
        window.__reactRouterContext.streamController.enqueue("${escaped}");
      </script>
    </html>
  `;
}

test("parses ChatGPT React Router stream payload", () => {
  const payload = [
    "loaderData",
    {
      "routes/share.$shareId.($action)": {
        serverResponse: {
          data: {
            linear_conversation: [
              {
                message: {
                  id: "hidden",
                  author: { role: "system" },
                  content: { parts: ["hidden"] },
                  metadata: { is_visually_hidden_from_conversation: true },
                },
              },
              {
                message: {
                  id: "u1",
                  author: { role: "user" },
                  content: { parts: ["问题是什么？"] },
                  create_time: 1,
                },
              },
              {
                message: {
                  id: "a1",
                  author: { role: "assistant" },
                  content: { parts: ["这是回答。"] },
                  create_time: 2,
                },
              },
            ],
          },
        },
      },
    },
  ];

  const parser = new ChatGptShareParser();
  const messages = parser.parse(createStreamHtml(payload));

  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({ id: "u1", role: "user", text: "问题是什么？" });
  expect(messages[1]).toMatchObject({ id: "a1", role: "assistant", text: "这是回答。" });
});

test("detects ChatGPT share URLs", () => {
  const parser = new ChatGptShareParser();

  expect(parser.canHandle("https://chatgpt.com/share/abc", "")).toBe(true);
  expect(parser.canHandle("https://chatgpt.com/c/abc", "")).toBe(false);
});
