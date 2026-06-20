import { access, readFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { join } from "node:path";
import { parsers } from "../parsers";
import { allAgentTargets } from "./paths";

export type DoctorStatus = "ok" | "warn" | "error";

export interface DoctorCheck {
  id: string;
  label: string;
  status: DoctorStatus;
  message: string;
}

export interface DoctorReport {
  name: string;
  version: string;
  checks: DoctorCheck[];
}

async function readPackageVersion(cwd = process.cwd()): Promise<string> {
  const text = await readFile(join(cwd, "package.json"), "utf8");
  const parsed = JSON.parse(text) as { version?: string };
  return parsed.version ?? "unknown";
}

async function canWrite(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function runDoctor(cwd = process.cwd()): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const version = await readPackageVersion(cwd);

  checks.push({
    id: "runtime",
    label: "Bun runtime",
    status: typeof Bun.version === "string" ? "ok" : "error",
    message: typeof Bun.version === "string" ? `Bun ${Bun.version}` : "未检测到 Bun",
  });

  checks.push({
    id: "parsers",
    label: "Supported parsers",
    status: parsers.length > 0 ? "ok" : "error",
    message: parsers.map((parser) => parser.platform).join(", "),
  });

  const exportsDir = join(cwd, "exports");
  checks.push({
    id: "exports",
    label: "Exports directory",
    status: existsSync(exportsDir) && await canWrite(exportsDir) ? "ok" : "warn",
    message: existsSync(exportsDir)
      ? "exports/ 可写"
      : "exports/ 不存在；使用 --export 时会自动创建",
  });

  const skillTemplates = allAgentTargets().filter((target) =>
    existsSync(join(cwd, "skills", target.id, "SKILL.md")),
  );
  checks.push({
    id: "skill-templates",
    label: "Agent skill templates",
    status: skillTemplates.length > 0 ? "ok" : "warn",
    message: skillTemplates.length > 0
      ? skillTemplates.map((target) => target.label).join(", ")
      : "未找到 skills/*/SKILL.md",
  });

  const installedTargets = allAgentTargets().filter((target) =>
    existsSync(join(target.skillDir, "SKILL.md")),
  );
  checks.push({
    id: "installed-skills",
    label: "Installed agent skills",
    status: installedTargets.length > 0 ? "ok" : "warn",
    message: installedTargets.length > 0
      ? installedTargets.map((target) => `${target.label}: ${target.skillDir}`).join("; ")
      : "未发现已安装 skill；可运行 chatlog skill --install --agent <agent>",
  });

  return {
    name: "chatlog-exporter",
    version,
    checks,
  };
}

function icon(status: DoctorStatus) {
  if (status === "ok") return "OK";
  if (status === "warn") return "WARN";
  return "ERR";
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = [
    `chatlog-exporter v${report.version}`,
    "=".repeat(40),
  ];

  for (const check of report.checks) {
    lines.push(`[${icon(check.status)}] ${check.label} - ${check.message}`);
  }

  const ok = report.checks.filter((check) => check.status === "ok").length;
  lines.push("");
  lines.push(`状态：${ok}/${report.checks.length} 项通过`);
  return lines.join("\n");
}

