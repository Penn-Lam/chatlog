---
name: chatlog
description: >
  Use when the user shares a ChatGPT, Gemini, or DeepSeek public chat link and
  wants the conversation exported, summarized from an export, converted to
  Markdown/JSON, archived, or preserved locally. Also use for local downloaded
  ChatGPT share HTML files.
triggers:
  - chatgpt.com/share
  - gemini.google.com/share
  - g.co/gemini/share
  - chat.deepseek.com/share
  - chat.deepseek.com/s
  - 聊天记录导出
  - chat export
metadata:
  agent: codex
---

# Chatlog

Chatlog exports public AI chat-share pages to structured JSON or Markdown.

## Rules

1. Use `bun`, not `npm`.
2. Prefer writing exports under `exports/` unless the user gives a path.
3. Run `bun src/cli.ts doctor` if export fails or after installation/update.
4. Use `--insecure` only when normal fetching fails because of local certificate issues.
5. Do not paste long raw exports into chat unless the user asks; summarize the file path and key counts.

## Commands

```sh
bun src/cli.ts export "https://chatgpt.com/share/..." --format md --export
bun src/cli.ts export "https://gemini.google.com/share/..." --out ./exports/gemini.json
bun src/cli.ts export "https://chat.deepseek.com/share/..." --format md
bun src/cli.ts doctor
```

## Install Or Update

Install guide:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/install.md

Update guide:
https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/update.md
