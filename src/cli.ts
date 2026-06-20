#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { formatDoctorReport, runDoctor } from "./agent/doctor";
import { installSkills, uninstallSkills } from "./agent/skill";
import { createExport, formatExport, inferFormat } from "./format";
import { findParser } from "./parsers";
import { loadSource } from "./source";
import { getBooleanOption, getStringOption, parseArgs } from "./utils/args";
import { parseSourceUrl } from "./utils/url";

const HELP_TEXT = `chatlog - 聊天记录导出 CLI

用法:
  chatlog export <share-url>
  chatlog export <share-url> --format md
  chatlog export <share-url> --export
  chatlog export <share-url> --out ./chat.json
  chatlog doctor
  chatlog skill --install --agent codex
  chatlog skill --uninstall --agent codex
  chatlog version
  chatlog check-update

参数:
  --out        输出文件路径；显式传入时写文件
  --export     写入默认 exports/<platform>-<share-id>.<format>；不传 --out 时生效
  --format     json 或 md；默认根据 --out 后缀推断，缺省为 json
  --insecure   URL 抓取时使用 curl -k，适合本机证书校验异常
  --agent      skill 目标：auto、codex、claude-code、cursor、openclaw
  --json       doctor 输出 JSON
  --help       显示帮助`;

function defaultOutputPath(input: string, platform: string, format: "json" | "md") {
  const parsedUrl = parseSourceUrl(input);
  const id = parsedUrl?.shareId ?? new Date().toISOString().replace(/[:.]/g, "-");
  return join("exports", `${platform}-${id}.${format}`);
}

async function runExport(
  input: string | undefined,
  options: Record<string, string | boolean>,
) {
  if (!input) {
    throw new Error(`缺少输入来源。\n\n${HELP_TEXT}`);
  }

  const outPath = getStringOption(options, "out");
  const format = inferFormat(getStringOption(options, "format"), outPath);
  const loaded = await loadSource(input, {
    insecure: getBooleanOption(options, "insecure"),
  });
  const parser = findParser(loaded.source, loaded.payload);
  const messages = parser.parse(loaded.payload);
  const data = createExport(loaded.source, parser.platform, messages);
  const output = formatExport(data, format);
  const shouldExport = getBooleanOption(options, "export");
  const resolvedOutPath =
    outPath ?? (shouldExport ? defaultOutputPath(input, parser.platform, format) : undefined);

  if (!resolvedOutPath) {
    process.stdout.write(output);
    return;
  }

  await mkdir(dirname(resolvedOutPath), { recursive: true });
  await writeFile(resolvedOutPath, output, "utf8");
  console.log(`已导出 ${data.messageCount} 条消息到 ${resolvedOutPath}`);
}

async function readPackageVersion(): Promise<string> {
  const text = await readFile("package.json", "utf8");
  const parsed = JSON.parse(text) as { version?: string };
  return parsed.version ?? "unknown";
}

async function runVersion() {
  const version = await readPackageVersion();
  console.log(`chatlog-exporter v${version}`);
}

async function runDoctorCommand(options: Record<string, string | boolean>) {
  const report = await runDoctor();
  if (getBooleanOption(options, "json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(formatDoctorReport(report));
}

async function runSkillCommand(options: Record<string, string | boolean>) {
  const agent = getStringOption(options, "agent") ?? "auto";
  const isInstall = getBooleanOption(options, "install");
  const isUninstall = getBooleanOption(options, "uninstall");

  if (isInstall === isUninstall) {
    throw new Error(`skill 命令需要且只能指定一个操作：--install 或 --uninstall`);
  }

  const changes = isInstall
    ? await installSkills({ agent: agent as "auto" })
    : await uninstallSkills({ agent: agent as "auto" });

  if (changes.length === 0) {
    console.log("未找到可操作的 Agent skill 目录。请用 --agent codex 等明确指定目标。");
    return;
  }

  for (const change of changes) {
    console.log(`${change.label}: ${change.message} - ${change.path}`);
  }
}

async function runCheckUpdate() {
  const version = await readPackageVersion();
  console.log(`当前版本：chatlog-exporter v${version}`);
  console.log("如需更新，把这句话发给 Agent：");
  console.log("帮我更新 Chatlog：https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/update.md");
}

export async function main(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv);
  const command = parsed.command[0];

  if (!command || command === "help" || parsed.options.help === true) {
    console.log(HELP_TEXT);
    return;
  }

  if (command === "export") {
    await runExport(
      parsed.command[1] ?? parsed.positionals[0],
      parsed.options,
    );
    return;
  }

  if (command === "doctor") {
    await runDoctorCommand(parsed.options);
    return;
  }

  if (command === "skill") {
    await runSkillCommand(parsed.options);
    return;
  }

  if (command === "version") {
    await runVersion();
    return;
  }

  if (command === "check-update") {
    await runCheckUpdate();
    return;
  }

  throw new Error(`未知命令：${command}\n\n${HELP_TEXT}`);
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    process.exitCode = 1;
  });
}
