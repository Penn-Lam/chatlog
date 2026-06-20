import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { appRoot } from "./runtime";
import {
  allAgentTargets,
  findAgentTarget,
  isAgentId,
  type AgentId,
  type AgentSkillTarget,
} from "./paths";

export interface SkillChange {
  agent: AgentId;
  label: string;
  path: string;
  status: "installed" | "removed" | "skipped";
  message: string;
}

export interface SkillOptions {
  agent?: AgentId | "auto";
  cwd?: string;
}

function skillSourceDir(agent: AgentId, cwd?: string) {
  return join(cwd ?? appRoot(), "skills", agent);
}

function resolveTargets(options: SkillOptions = {}): AgentSkillTarget[] {
  const requested = options.agent ?? "auto";
  if (requested !== "auto") {
    if (!isAgentId(requested)) {
      throw new Error(`未知 Agent：${requested}`);
    }
    const target = findAgentTarget(requested);
    return target ? [target] : [];
  }

  return allAgentTargets().filter((target) => existsSync(target.parentDir));
}

export async function installSkills(options: SkillOptions = {}): Promise<SkillChange[]> {
  const targets = resolveTargets(options);
  const changes: SkillChange[] = [];

  for (const target of targets) {
    const source = skillSourceDir(target.id, options.cwd);
    if (!existsSync(source)) {
      changes.push({
        agent: target.id,
        label: target.label,
        path: target.skillDir,
        status: "skipped",
        message: `未找到 skill 模板：${source}`,
      });
      continue;
    }

    await mkdir(dirname(target.skillDir), { recursive: true });
    await rm(target.skillDir, { recursive: true, force: true });
    await cp(source, target.skillDir, { recursive: true });
    changes.push({
      agent: target.id,
      label: target.label,
      path: target.skillDir,
      status: "installed",
      message: "已安装",
    });
  }

  return changes;
}

export async function uninstallSkills(options: SkillOptions = {}): Promise<SkillChange[]> {
  const targets = resolveTargets(options);
  const changes: SkillChange[] = [];

  for (const target of targets) {
    if (!existsSync(target.skillDir)) {
      changes.push({
        agent: target.id,
        label: target.label,
        path: target.skillDir,
        status: "skipped",
        message: "未安装",
      });
      continue;
    }

    await rm(target.skillDir, { recursive: true, force: true });
    changes.push({
      agent: target.id,
      label: target.label,
      path: target.skillDir,
      status: "removed",
      message: "已卸载",
    });
  }

  return changes;
}
