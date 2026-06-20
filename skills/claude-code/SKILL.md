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
3. Run `chatlog doctor` after install/update or when diagnosing failures.
4. Use `--insecure` only for local certificate problems.

## Commands

```sh
chatlog export "https://chatgpt.com/share/..." --format md --export
chatlog export "https://gemini.google.com/share/..." --export-dir ./plans
chatlog export "https://gemini.google.com/share/..." --out ./exports/gemini.json
chatlog export "https://chat.deepseek.com/share/..." --format md
chatlog doctor
```

Install:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/install.md

Update:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/update.md
