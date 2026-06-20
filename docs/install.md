# Chatlog — Installation Guide

## For Humans

Copy and paste this message to your AI Agent:

```
Please help me install Chatlog:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/install.md
```

After the installation is complete, you can directly send public sharing links from ChatGPT, Gemini, or DeepSeek to the Agent, and it will export them as JSON or Markdown.

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

Install Chatlog into a stable user-level tools directory, outside the user's active project workspace.

```sh
CHATLOG_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/chatlog"
mkdir -p "$(dirname "$CHATLOG_HOME")"
if [ -d "$CHATLOG_HOME/.git" ]; then
  git -C "$CHATLOG_HOME" pull --ff-only
else
  git clone https://github.com/Penn-Lam/chatlog.git "$CHATLOG_HOME"
fi
cd "$CHATLOG_HOME"
```

### Step 2: Install dependencies

```sh
bun install
bun run typecheck
bun run test
```

### Step 3: Install the global command

```sh
bun src/cli.ts install-bin
```

This creates `~/.local/bin/chatlog`. If `chatlog` is not found afterwards, add `~/.local/bin` to the user's `PATH`.

### Step 4: Register agent skill

Pick the current agent when known:

```sh
chatlog skill --install --agent codex
chatlog skill --install --agent claude-code
chatlog skill --install --agent cursor
chatlog skill --install --agent openclaw
```

If unsure, try auto mode. It installs into detected existing skill directories:

```sh
chatlog skill --install --agent auto
```

### Step 5: Verify

```sh
chatlog doctor
```

Expected result: Bun runtime, supported parsers, and skill templates should be OK. Installed agent skills should be OK after Step 3.

### Quick Reference

```sh
chatlog export "https://chatgpt.com/share/..." --format md
chatlog export "https://gemini.google.com/share/..." --export
chatlog export "https://chat.deepseek.com/share/..." --export-dir ./plans
chatlog export "https://chat.deepseek.com/share/..." --out ./exports/chat.json
chatlog doctor
chatlog check-update
```
