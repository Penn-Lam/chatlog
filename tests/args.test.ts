import { expect, test } from "bun:test";
import { getBooleanOption, getStringOption, parseArgs } from "../src/utils/args";

test("parses command, options, and positionals", () => {
  const parsed = parseArgs([
    "export",
    "https://chatgpt.com/share/abc",
    "--out",
    "./chat.md",
    "--format=md",
    "--insecure",
  ]);

  expect(parsed.command).toEqual(["export", "https://chatgpt.com/share/abc"]);
  expect(getStringOption(parsed.options, "out")).toBe("./chat.md");
  expect(getStringOption(parsed.options, "format")).toBe("md");
  expect(getBooleanOption(parsed.options, "insecure")).toBe(true);
});
