<div align="center">
  <img src="assets/logo.png" alt="Chatlog" width="640">
</div>

<p align="center">
  把公开分享的 AI 对话导出为干净的 JSON 或 Markdown。
</p>

<p align="center">
  <a href="README.md">English README</a> ·
  <a href="docs/install.md">让 Agent 安装</a> ·
  <a href="docs/update.md">更新指南</a>
</p>

# Chatlog

Chatlog 是一个独立 Bun CLI，用于把公开分享的聊天记录解析成标准 JSON 或 Markdown。

当前支持：

- ChatGPT share 链接：`https://chatgpt.com/share/...`
- 已下载的 ChatGPT share HTML 文件
- DeepSeek share 链接：`https://chat.deepseek.com/share/...` 或 `https://chat.deepseek.com/s/...`
- Gemini share 链接：`https://gemini.google.com/share/...` 或 `https://g.co/gemini/share/...`

## 背景故事

Codex 很适合落地代码：读项目、改文件、跑测试、提交变更。但在 Codex 工作区里，并不总能直接使用更强的 GPT Pro 系列模型。

而 GPT Pro 系列模型很适合做前期 Plan：讨论产品方向、比较实现方案、推敲架构、整理需求边界，在真正写代码前把问题想清楚。

Chatlog 解决的是这两者之间的断层。

你可以先在网页上和 Pro 系列模型进行深入规划对话，然后分享这段对话，再用 Chatlog 把共享页面导出成本地 JSON 或 Markdown。这样 Codex 就能看到你和 Pro 模型讨论出来的完整上下文，包括决策、约束、取舍和理由，再继续进入实现阶段。

简单说：先用 Pro 模型把方案聊清楚，再让 Codex 读取这段共享对话并执行。

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

默认行为是直接打印到终端。只有传入 `--out` 或 `--export` 时才会写文件：

- `--out ./path/file.json`：写入指定文件
- `--export`：写入默认路径 `exports/<platform>-<share-id>.<format>`

如果本机遇到证书校验异常，可以使用：

```sh
bun src/cli.ts export "https://chatgpt.com/share/..." --out ./exports/chat.json --insecure
```

`--insecure` 会调用 `curl -k` 抓取页面，仅建议在本机证书环境异常时使用。

## Agent 支持

Chatlog 提供了不同 Agent 的 `SKILL.md` 模板。安装后，Agent 在遇到 ChatGPT、Gemini、DeepSeek 分享链接时，会优先调用 Chatlog 导出结构化记录。

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

当前模板：

- Codex：`skills/codex/SKILL.md`
- Claude Code：`skills/claude-code/SKILL.md`
- Cursor：`skills/cursor/SKILL.md`
- OpenClaw：`skills/openclaw/SKILL.md`

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

始终使用 `bun`，不要使用 `npm`。

```sh
bun install
bun run typecheck
bun run test
bun run lint
```

## 设计说明

这是一个聚焦的 CLI 项目，不是单次使用的自动化脚本。解析器采用平台插件结构，后续可以继续增加新的共享对话来源，同时保持导出格式和 CLI 工作流稳定。

## License

MIT. See [LICENSE](LICENSE).
