import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { main } from "../src/cli";

const chatgptHtml = `
  <div data-message-author-role="user"><p>Hello?</p></div>
  <div data-message-author-role="assistant"><p>Hi!</p></div>
`;

test("prints to stdout by default", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chatlog-cli-"));
  const input = join(dir, "chat.html");
  await Bun.write(input, chatgptHtml);

  let output = "";
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    output += chunk.toString();
    return true;
  }) as typeof process.stdout.write;

  try {
    await main(["export", input]);
  } finally {
    process.stdout.write = originalWrite;
    rmSync(dir, { recursive: true, force: true });
  }

  const parsed = JSON.parse(output);
  expect(parsed.messageCount).toBe(2);
  expect(parsed.messages[0].text).toBe("Hello?");
});

test("exports to a default file only when --export is set", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chatlog-cli-"));
  const input = join(dir, "chat.html");
  await Bun.write(input, chatgptHtml);
  const oldCwd = process.cwd();

  try {
    process.chdir(dir);
    await main(["export", input, "--export"]);
    const files = Array.from(new Bun.Glob("exports/*.json").scanSync("."));
    expect(files).toHaveLength(1);
    expect(existsSync(join(dir, files[0]))).toBe(true);
  } finally {
    process.chdir(oldCwd);
    rmSync(dir, { recursive: true, force: true });
  }
});
