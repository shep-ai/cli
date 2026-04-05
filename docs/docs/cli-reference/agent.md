---
id: agent
title: shep agent
---

# `shep agent`

Manage and run Shep agents. List available agents, check status, and invoke agents directly.

## Synopsis

```bash
shep agent [subcommand] [options]
```

## Subcommands

### `shep agent list`

List all available agents.

```bash
shep agent list
```

### `shep agent run <agent-name>`

Run an agent directly with a custom prompt.

```bash
shep agent run code-explorer --prompt "Explain the auth module"
```

**Options:**

| Option | Description |
|--------|-------------|
| `--prompt <text>` | The prompt to send to the agent |
| `--file <path>` | Read prompt from a file |
| `--repo <path>` | Target repository path |
| `--output <path>` | Save agent output to a file |
| `--max-steps <n>` | Override maximum steps |

### `shep agent status`

Show the status of currently running agents.

```bash
shep agent status
```

### `shep agent stop <id>`

Stop a running agent by ID.

```bash
shep agent stop abc123
```

### `shep agent logs <id>`

Stream logs for a running or completed agent.

```bash
shep agent logs abc123
shep agent logs abc123 --follow
```

## Available Agents

| Agent | Description |
|-------|-------------|
| `code-explorer` | Analyzes codebase structure and patterns |
| `code-architect` | Designs implementation plans |
| `code-developer` | Writes code following plans |
| `code-reviewer` | Reviews code for quality and bugs |

## Examples

```bash
# Run the explorer to understand an auth module
shep agent run code-explorer --prompt "Trace the authentication flow"

# Check what's currently running
shep agent status

# Stream logs from a running agent
shep agent logs abc123 --follow
```
