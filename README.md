# chatlog-exporter

独立 Bun CLI，用于把公开分享的聊天记录解析成标准 JSON 或 Markdown。

当前支持：

- ChatGPT share 链接：`https://chatgpt.com/share/...`
- 已下载的 ChatGPT share HTML 文件
- DeepSeek share 链接：`https://chat.deepseek.com/share/...` 或 `https://chat.deepseek.com/s/...`
- Gemini share 链接：`https://gemini.google.com/share/...` 或 `https://g.co/gemini/share/...`

## 使用

```sh
bun src/cli.ts export "https://chatgpt.com/share/..."
bun src/cli.ts export "https://chatgpt.com/share/..." --format md
bun src/cli.ts export "https://chatgpt.com/share/..." --export
bun src/cli.ts export "https://chatgpt.com/share/..." --out ./exports/chat.json
bun src/cli.ts export "https://chat.deepseek.com/share/..."
bun src/cli.ts export "https://gemini.google.com/share/..."
bun src/cli.ts export ./chatgpt-share.html
```

Agent 安装、更新和诊断：

```sh
bun src/cli.ts doctor
bun src/cli.ts skill --install --agent codex
bun src/cli.ts skill --install --agent claude-code
bun src/cli.ts skill --install --agent cursor
bun src/cli.ts skill --install --agent openclaw
bun src/cli.ts check-update
```

给人类复制给 Agent 的文档：

- 安装：[docs/install.md](docs/install.md)
- 更新：[docs/update.md](docs/update.md)

如果本机遇到证书校验异常，可以使用：

```sh
bun src/cli.ts export "https://chatgpt.com/share/..." --out ./exports/chat.json --insecure
```

`--insecure` 会调用 `curl -k` 抓取页面，仅建议在本机证书环境异常时使用。

默认行为是直接打印到终端。只有传入 `--out` 或 `--export` 时才会写文件：

- `--out ./path/file.json`：写入指定文件
- `--export`：写入默认路径 `exports/<platform>-<share-id>.<format>`

## 输出结构

JSON 输出包含：

- `source`
- `platform`
- `exportedAt`
- `messageCount`
- `roleCounts`
- `messages`

每条 message 包含 `index`、`id`、`role`、`text` 和可选 `metadata`。

## 开发

```sh
bun run typecheck
bun run test
```

## Agent 支持

`skills/` 中提供了不同 Agent 的 `SKILL.md` 模板。安装后，Agent 在遇到 ChatGPT、Gemini、DeepSeek 分享链接时，会优先调用 Chatlog 导出结构化记录，而不是临时拼接抓取脚本。

当前模板：

- Codex：`skills/codex/SKILL.md`
- Claude Code：`skills/claude-code/SKILL.md`
- Cursor：`skills/cursor/SKILL.md`
- OpenClaw：`skills/openclaw/SKILL.md`

## 设计说明

这是一个独立 CLI 项目，不是单文件自动化脚本。解析器采用平台插件结构，当前对齐 ChatGPT、DeepSeek、Gemini 三类分享导入能力，后续可以继续增加 Claude 等来源解析器。
