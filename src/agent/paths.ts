import { homedir } from "node:os";
import { join } from "node:path";

export type AgentId = "codex" | "claude-code" | "cursor" | "openclaw";

export interface AgentSkillTarget {
  id: AgentId;
  label: string;
  parentDir: string;
  skillDir: string;
}

function agentDefinitions(): Array<{ id: AgentId; label: string; parentDir: string }> {
  return [
    {
      id: "codex",
      label: "Codex",
      parentDir: join(process.env.CODEX_HOME ?? join(homedir(), ".codex"), "skills"),
    },
    {
      id: "claude-code",
      label: "Claude Code",
      parentDir: join(process.env.CLAUDE_HOME ?? join(homedir(), ".claude"), "skills"),
    },
    {
      id: "cursor",
      label: "Cursor",
      parentDir: join(process.env.CURSOR_HOME ?? join(homedir(), ".cursor"), "skills"),
    },
    {
      id: "openclaw",
      label: "OpenClaw",
      parentDir: join(process.env.OPENCLAW_HOME ?? join(homedir(), ".openclaw"), "skills"),
    },
  ];
}

export function allAgentTargets(): AgentSkillTarget[] {
  return agentDefinitions().map((agent) => ({
    ...agent,
    skillDir: join(agent.parentDir, "chatlog"),
  }));
}

export function findAgentTarget(agentId: string): AgentSkillTarget | undefined {
  return allAgentTargets().find((target) => target.id === agentId);
}

export function isAgentId(value: string): value is AgentId {
  return agentDefinitions().some((agent) => agent.id === value);
}
