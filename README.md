<p align="center">
  <img src="assets/logo.png" alt="Chatlog" width="640">
</p>

<p align="center">
  Export shared AI conversations into clean JSON or Markdown.
</p>

<p align="center">
  <a href="README.zh-CN.md">中文 README</a> ·
  <a href="docs/install.md">Install with an agent</a> ·
  <a href="docs/update.md">Update guide</a>
</p>

# Chatlog

Chatlog is a standalone Bun CLI for turning public shared chat pages into structured JSON or Markdown.

It currently supports:

- ChatGPT share links: `https://chatgpt.com/share/...`
- Downloaded ChatGPT share HTML files
- DeepSeek share links: `https://chat.deepseek.com/share/...` or `https://chat.deepseek.com/s/...`
- Gemini share links: `https://gemini.google.com/share/...` or `https://g.co/gemini/share/...`

## Why This Exists

Codex is excellent at implementing, editing, testing, and shipping code, but it cannot always use the more powerful GPT Pro model family directly inside the coding workspace. Those Pro models are often better for early-stage planning: discussing product direction, comparing implementation options, shaping architecture, and refining requirements before any code is written.

Chatlog bridges that gap.

You can have a deep planning conversation with a Pro model on the web, share that conversation, and then use this CLI to export the shared page. Once exported, Codex can read the full planning context as a local JSON or Markdown artifact and continue with implementation using the same decisions, constraints, and rationale.

In short: use the Pro model for the planning conversation, then let Codex see that shared conversation and build from it.

## Usage

```sh
bun src/cli.ts export "https://chatgpt.com/share/..."
bun src/cli.ts export "https://chatgpt.com/share/..." --format md
bun src/cli.ts export "https://chatgpt.com/share/..." --export
bun src/cli.ts export "https://chatgpt.com/share/..." --out ./exports/chat.json
bun src/cli.ts export "https://chat.deepseek.com/share/..."
bun src/cli.ts export "https://gemini.google.com/share/..."
bun src/cli.ts export ./chatgpt-share.html
```

By default, Chatlog prints the result to stdout. It only writes files when `--out` or `--export` is provided:

- `--out ./path/file.json`: write to an explicit file path
- `--export`: write to `exports/<platform>-<share-id>.<format>`

If your local certificate setup breaks page fetching, use:

```sh
bun src/cli.ts export "https://chatgpt.com/share/..." --out ./exports/chat.json --insecure
```

`--insecure` uses `curl -k` and should only be used for local certificate problems.

## Agent Setup

Chatlog includes skill templates so coding agents can install, update, diagnose, and call the exporter without the user memorizing commands.

```sh
bun src/cli.ts doctor
bun src/cli.ts skill --install --agent codex
bun src/cli.ts skill --install --agent claude-code
bun src/cli.ts skill --install --agent cursor
bun src/cli.ts skill --install --agent openclaw
bun src/cli.ts check-update
```

Human-facing agent guides:

- Install: [docs/install.md](docs/install.md)
- Update: [docs/update.md](docs/update.md)

Skill templates:

- Codex: `skills/codex/SKILL.md`
- Claude Code: `skills/claude-code/SKILL.md`
- Cursor: `skills/cursor/SKILL.md`
- OpenClaw: `skills/openclaw/SKILL.md`

## Output Shape

JSON exports contain:

- `source`
- `platform`
- `exportedAt`
- `messageCount`
- `roleCounts`
- `messages`

Each message contains `index`, `id`, `role`, `text`, and optional `metadata`.

## Development

Always use `bun`, not `npm`.

```sh
bun install
bun run typecheck
bun run test
bun run lint
```

## Design

Chatlog is a focused CLI, not a single-use automation script. Parsers follow a platform plugin structure, so support for additional shared-chat sources can be added without changing the export format or CLI workflow.

## License

MIT. See [LICENSE](LICENSE).
