import { expect, test } from "bun:test";
import { DeepseekShareParser } from "../src/parsers/deepseek";

function createPayload(messages: unknown[]) {
  return {
    code: 0,
    data: {
      biz_data: {
        messages,
      },
    },
  };
}

test("parses DeepSeek share payload with reasoning fragments", () => {
  const parser = new DeepseekShareParser();
  const messages = parser.parse(
    createPayload([
      {
        message_id: 1,
        role: "USER",
        fragments: [{ type: "REQUEST", content: "What is the weather?" }],
      },
      {
        message_id: 2,
        role: "ASSISTANT",
        fragments: [
          { type: "THINK", content: "Reasoning text." },
          { type: "RESPONSE", content: "It is sunny." },
        ],
      },
    ]),
  );

  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({
    id: "1",
    role: "user",
    text: "What is the weather?",
  });
  expect(messages[1].text).toContain("<reasoning>");
  expect(messages[1].text).toContain("It is sunny.");
});

test("throws when DeepSeek payload misses required roles", () => {
  const parser = new DeepseekShareParser();
  expect(() =>
    parser.parse(
      createPayload([
        {
          message_id: 1,
          role: "ASSISTANT",
          fragments: [{ type: "RESPONSE", content: "Only assistant." }],
        },
      ]),
    ),
  ).toThrow();
});
