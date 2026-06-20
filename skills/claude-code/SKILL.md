---
name: chatlog
description: >
  Use when the user shares a ChatGPT, Gemini, or DeepSeek public chat link and
  wants the conversation exported to JSON/Markdown, archived, or converted.
  Supports local downloaded ChatGPT share HTML files.
metadata:
  agent: claude-code
---

# Chatlog

Use Chatlog to export public AI chat-share pages.

## Rules

1. Use `bun`, not `npm`.
2. Keep generated exports in `exports/` unless the user specifies another path.
3. Run `bun src/cli.ts doctor` after install/update or when diagnosing failures.
4. Use `--insecure` only for local certificate problems.

## Commands

```sh
bun src/cli.ts export "https://chatgpt.com/share/..." --format md --export
bun src/cli.ts export "https://gemini.google.com/share/..." --out ./exports/gemini.json
bun src/cli.ts export "https://chat.deepseek.com/share/..." --format md
bun src/cli.ts doctor
```

Install:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/install.md

Update:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/update.md
