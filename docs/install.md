# Chatlog — Installation Guide

## For Humans

把这句话复制给你的 AI Agent：

```text
帮我安装 Chatlog：https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/install.md
```

安装完成后，你可以直接把 ChatGPT、Gemini、DeepSeek 的公开分享链接发给 Agent，让它导出 JSON 或 Markdown。

---

## For AI Agents

### Goal

Install Chatlog, verify it works, and register the matching agent skill so future chat-share links can be exported without the user remembering commands.

### Boundaries

- Do not use `sudo` unless the user explicitly approves.
- Do not modify unrelated project files.
- Use `bun`, not `npm`.
- Keep temporary files in `/tmp/`.
- If the user is inside a project workspace, avoid cloning Chatlog into that workspace unless they ask for that location.

### Step 1: Get the project

If Chatlog is already available locally, use that directory. Otherwise clone it from GitHub into a neutral tools directory outside the user's active project workspace.

```sh
git clone https://github.com/Penn-Lam/chatlog.git chatlog
cd chatlog
```

### Step 2: Install dependencies

```sh
bun install
bun run typecheck
bun run test
```

### Step 3: Register agent skill

Pick the current agent when known:

```sh
bun src/cli.ts skill --install --agent codex
bun src/cli.ts skill --install --agent claude-code
bun src/cli.ts skill --install --agent cursor
bun src/cli.ts skill --install --agent openclaw
```

If unsure, try auto mode. It installs into detected existing skill directories:

```sh
bun src/cli.ts skill --install --agent auto
```

### Step 4: Verify

```sh
bun src/cli.ts doctor
```

Expected result: Bun runtime, supported parsers, and skill templates should be OK. Installed agent skills should be OK after Step 3.

### Quick Reference

```sh
bun src/cli.ts export "https://chatgpt.com/share/..." --format md
bun src/cli.ts export "https://gemini.google.com/share/..." --export
bun src/cli.ts export "https://chat.deepseek.com/share/..." --out ./exports/chat.json
bun src/cli.ts doctor
bun src/cli.ts check-update
```
