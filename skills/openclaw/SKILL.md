---
name: chatlog
description: >
  Use when the user provides ChatGPT, Gemini, or DeepSeek share links and asks
  to export, archive, or convert the conversation.
metadata:
  agent: openclaw
---

# Chatlog

Chatlog exports public AI chat-share pages to JSON or Markdown.

## OpenClaw Note

This skill requires shell execution. If commands are unavailable, ask the user
to enable the coding tools profile and restart the gateway.

## Rules

1. Use `bun`, not `npm`.
2. Keep output under `exports/` unless the user gives a path.
3. Run `chatlog doctor` after installation and when an export fails.

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
