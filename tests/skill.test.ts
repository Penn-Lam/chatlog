import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "bun:test";
import { installSkills, uninstallSkills } from "../src/agent/skill";

async function createProjectWithSkill(agent = "codex") {
  const dir = mkdtempSync(join(tmpdir(), "chatlog-skill-project-"));
  const skillDir = join(dir, "skills", agent);
  await mkdir(skillDir, { recursive: true });
  await writeFile(join(skillDir, "SKILL.md"), "# Chatlog Test\n", "utf8");
  return dir;
}

test("installs and uninstalls a requested agent skill", async () => {
  const project = await createProjectWithSkill("codex");
  const home = mkdtempSync(join(tmpdir(), "chatlog-skill-home-"));
  const oldCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = join(home, ".codex");

  try {
    const changes = await installSkills({ agent: "codex", cwd: project });
    const target = join(home, ".codex", "skills", "chatlog", "SKILL.md");

    expect(changes).toHaveLength(1);
    expect(changes[0].status).toBe("installed");
    expect(existsSync(target)).toBe(true);
    expect(readFileSync(target, "utf8")).toContain("Chatlog Test");

    const removed = await uninstallSkills({ agent: "codex", cwd: project });
    expect(removed[0].status).toBe("removed");
    expect(existsSync(target)).toBe(false);
  } finally {
    if (oldCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = oldCodexHome;
    }
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test("auto install only uses existing parent directories", async () => {
  const project = await createProjectWithSkill("cursor");
  const home = mkdtempSync(join(tmpdir(), "chatlog-skill-home-"));
  const oldCursorHome = process.env.CURSOR_HOME;
  const oldCodexHome = process.env.CODEX_HOME;
  const oldClaudeHome = process.env.CLAUDE_HOME;
  const oldOpenclawHome = process.env.OPENCLAW_HOME;
  process.env.CURSOR_HOME = join(home, ".cursor");
  process.env.CODEX_HOME = join(home, ".codex");
  process.env.CLAUDE_HOME = join(home, ".claude");
  process.env.OPENCLAW_HOME = join(home, ".openclaw");

  try {
    await mkdir(join(home, ".cursor", "skills"), { recursive: true });
    const changes = await installSkills({ agent: "auto", cwd: project });

    expect(changes.map((change) => change.agent)).toEqual(["cursor"]);
    expect(existsSync(join(home, ".cursor", "skills", "chatlog", "SKILL.md"))).toBe(true);
    expect(existsSync(join(home, ".codex", "skills", "chatlog", "SKILL.md"))).toBe(false);
  } finally {
    if (oldCursorHome === undefined) {
      delete process.env.CURSOR_HOME;
    } else {
      process.env.CURSOR_HOME = oldCursorHome;
    }
    if (oldCodexHome === undefined) {
      delete process.env.CODEX_HOME;
    } else {
      process.env.CODEX_HOME = oldCodexHome;
    }
    if (oldClaudeHome === undefined) {
      delete process.env.CLAUDE_HOME;
    } else {
      process.env.CLAUDE_HOME = oldClaudeHome;
    }
    if (oldOpenclawHome === undefined) {
      delete process.env.OPENCLAW_HOME;
    } else {
      process.env.OPENCLAW_HOME = oldOpenclawHome;
    }
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});
