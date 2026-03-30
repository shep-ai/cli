---
id: settings
title: shep settings
---

# `shep settings`

View and edit Shep configuration. Manage global and project-level settings.

## Synopsis

```bash
shep settings [subcommand] [key] [value]
```

## Subcommands

### `shep settings` (default)

Open an interactive settings editor.

```bash
shep settings
```

### `shep settings get <key>`

Get the value of a specific setting.

```bash
shep settings get ai.provider
shep settings get ui.port
```

### `shep settings set <key> <value>`

Set a configuration value.

```bash
shep settings set ai.provider anthropic
shep settings set ui.port 8080
shep settings set agent.maxSteps 100
```

### `shep settings list`

List all current settings.

```bash
shep settings list
```

**Options:**

| Option | Description |
|--------|-------------|
| `--global` | Show only global settings |
| `--local` | Show only project-level settings |
| `--json` | Output as JSON |

### `shep settings reset`

Reset settings to defaults.

```bash
shep settings reset
shep settings reset ai.model
```

## Settings Reference

### AI Settings

| Key | Description | Default |
|-----|-------------|---------|
| `ai.provider` | AI provider (`anthropic`, `openai`) | `anthropic` |
| `ai.model` | Model to use | `claude-opus-4-5` |
| `ai.apiKey` | API key | — |

### GitHub Settings

| Key | Description | Default |
|-----|-------------|---------|
| `github.token` | Personal access token | — |
| `github.defaultBranch` | Base branch for PRs | `main` |
| `github.autoPR` | Auto-create PRs | `false` |

### Agent Settings

| Key | Description | Default |
|-----|-------------|---------|
| `agent.maxSteps` | Max steps per run | `50` |
| `agent.autoCommit` | Auto-commit changes | `true` |
| `agent.worktrees` | Use git worktrees | `true` |

### UI Settings

| Key | Description | Default |
|-----|-------------|---------|
| `ui.port` | Web UI port | `3000` |
| `ui.host` | Bind address | `localhost` |
| `ui.autoOpen` | Auto-open browser | `true` |

## Configuration File

Settings are stored in `~/.shep/config.json`. You can edit this file directly, but using `shep settings` is recommended to ensure valid values.
