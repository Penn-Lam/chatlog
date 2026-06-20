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

test("exports to custom directory when --export-dir is set", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chatlog-cli-"));
  const input = join(dir, "chat.html");
  await Bun.write(input, chatgptHtml);
  const oldCwd = process.cwd();

  try {
    process.chdir(dir);
    await main(["export", input, "--export-dir", "plans"]);
    const files = Array.from(new Bun.Glob("plans/*.json").scanSync("."));
    expect(files).toHaveLength(1);
    expect(existsSync(join(dir, files[0]))).toBe(true);
  } finally {
    process.chdir(oldCwd);
    rmSync(dir, { recursive: true, force: true });
  }
});

test("installs a bin shim into a custom directory", async () => {
  const dir = mkdtempSync(join(tmpdir(), "chatlog-bin-"));

  try {
    await main(["install-bin", "--bin-dir", dir]);
    const target = join(dir, "chatlog");
    expect(existsSync(target)).toBe(true);
    expect(await Bun.file(target).text()).toContain("exec bun");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("check-update reports newer GitHub release", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const logs: string[] = [];

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({
      tag_name: "v0.2.0",
      html_url: "https://github.com/Penn-Lam/chatlog/releases/tag/v0.2.0",
      body: "Release notes",
    }), { status: 200 })) as unknown as typeof fetch;
  console.log = (...args: unknown[]) => {
    logs.push(args.join(" "));
  };

  try {
    await main(["check-update"]);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }

  expect(logs.join("\n")).toContain("发现新版本：v0.2.0");
  expect(logs.join("\n")).toContain("Release notes");
});

test("check-update falls back when no release exists", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const logs: string[] = [];

  globalThis.fetch = (async () =>
    new Response("not found", { status: 404 })) as unknown as typeof fetch;
  console.log = (...args: unknown[]) => {
    logs.push(args.join(" "));
  };

  try {
    await main(["check-update"]);
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }

  expect(logs.join("\n")).toContain("尚未发现 GitHub release");
  expect(logs.join("\n")).toContain("帮我更新 Chatlog");
});
