---
id: session
title: shep session
---

# `shep session`

Start and manage interactive agent sessions — real-time conversations with a Shep agent for guided development, debugging, and exploration.

## Synopsis

```bash
shep session [subcommand] [options]
```

## Subcommands

### `shep session` (default)

Start a new interactive session.

```bash
shep session
```

Launches an interactive terminal session. Type your instructions or questions and the agent responds with actions, explanations, and code changes.

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--repo <path>` | Target repository | Current directory |
| `--agent <name>` | Which agent to use | `code-developer` |
| `--feature <id>` | Attach to an existing feature | — |

### `shep session list`

List all sessions (current and past).

```bash
shep session list
```

**Options:**

| Option | Description |
|--------|-------------|
| `--active` | Show only active sessions |
| `--json` | Output as JSON |

### `shep session resume <id>`

Resume a previous session.

```bash
shep session resume abc123
```

### `shep session show <id>`

Show details and history for a session.

```bash
shep session show abc123
```

### `shep session stop <id>`

Stop an active session.

```bash
shep session stop abc123
```

## Examples

```bash
# Start a new session
shep session

# Start a session attached to a feature
shep session --feature 003

# Resume a previous session
shep session resume abc123

# List all active sessions
shep session list --active
```

## Tips

- Sessions are persistent — you can detach and resume later
- Use `shep ui` to view session history and agent reasoning in the browser
- Type `exit` or press `Ctrl+D` to end a session
