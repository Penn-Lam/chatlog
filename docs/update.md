# Chatlog — Update Guide

## For Humans

Copy and paste this message to your AI Agent:

```text
Help me update Chatlog：https://raw.githubusercontent.com/Penn-Lam/chatlog/main/docs/update.md
```

---

## For AI Agents

### Goal

Update Chatlog, refresh dependencies, re-register agent skills, and verify the exporter still works.

### Boundaries

- Use `bun`, not `npm`.
- Do not overwrite unrelated local changes.
- Do not delete the user's exported chat logs.
- Do not use `sudo` unless the user explicitly approves.

### Step 1: Locate Chatlog

Use the existing Chatlog directory if the user has one. If the current directory is the Chatlog repository, stay there.

```sh
CHATLOG_HOME="${XDG_DATA_HOME:-$HOME/.local/share}/chatlog"
cd "$CHATLOG_HOME"
```

### Step 2: Update source

If this is a git checkout and the user allows updating from remote:

```sh
git pull
```

If there are local changes, inspect them first and avoid overwriting user work.

### Step 3: Refresh dependencies

```sh
bun install
bun run typecheck
bun run test
bun src/cli.ts install-bin
```

### Step 4: Reinstall skill

Use the current agent when known:

```sh
chatlog skill --install --agent codex
```

Or auto-detect existing skill directories:

```sh
chatlog skill --install --agent auto
```

### Step 5: Verify and report

```sh
chatlog version
chatlog doctor
```

Tell the user:

- Current version.
- Whether typecheck and tests passed.
- Which agent skill was installed.
- Any manual action still needed.
