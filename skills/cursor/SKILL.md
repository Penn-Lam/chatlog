---
name: chatlog
description: >
  Use for exporting ChatGPT, Gemini, and DeepSeek shared conversations into
  local JSON or Markdown files.
metadata:
  agent: cursor
---

# Chatlog

Chatlog is a Bun CLI for exporting public AI chat-share links.

## Rules

1. Use `bun`, not `npm`.
2. Export files to `exports/` by default.
3. Run `chatlog doctor` when setting up or debugging.
4. Keep edits small and do not change unrelated project code.

## Commands

```sh
chatlog export "https://chatgpt.com/share/..." --format md --export
chatlog export "https://gemini.google.com/share/..." --export-dir ./plans
chatlog export "https://gemini.google.com/share/..." --out ./exports/gemini.json
chatlog export "https://chat.deepseek.com/share/..." --format md
```

Install:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/install.md

Update:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/update.md
