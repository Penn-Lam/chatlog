import { expect, test } from "bun:test";
import {
  GeminiShareParser,
  extractAtFromShareHtml,
  extractGeminiSessionParamsFromShareHtml,
  parseGeminiBatchexecute,
} from "../src/parsers/gemini";

function createBatchExecute(user: string, assistant: string): string {
  const inner = JSON.stringify([
    null,
    [[null, null, [[user]], [[[null, [assistant]]]]]],
  ]);
  return (
    ")]}'\n" +
    JSON.stringify([["wrb.fr", "ujx1Bf", inner, null, "generic"]])
  );
}

test("extracts Gemini share page params", () => {
  const html = `
    <input name="SNlM0e" value="AT\\u003dTOKEN" />
    <script>window.WIZ_global_data = {"cfb2h":"BL_TOKEN","FdrFJe":"FSID_TOKEN"}</script>
  `;

  expect(extractAtFromShareHtml(html)).toBe("AT=TOKEN");
  expect(extractGeminiSessionParamsFromShareHtml(html)).toEqual({
    bl: "BL_TOKEN",
    fSid: "FSID_TOKEN",
  });
});

test("parses Gemini batchexecute snapshot", () => {
  const parser = new GeminiShareParser();
  const messages = parser.parse({
    shareUrl: "https://gemini.google.com/share/abc",
    batchexecute: createBatchExecute("Hello?", "Hi!"),
  });

  expect(parseGeminiBatchexecute(createBatchExecute("Hello?", "Hi!"))).toBeArray();
  expect(messages).toHaveLength(2);
  expect(messages[0]).toMatchObject({ role: "user", text: "Hello?" });
  expect(messages[1]).toMatchObject({ role: "assistant", text: "Hi!" });
});
