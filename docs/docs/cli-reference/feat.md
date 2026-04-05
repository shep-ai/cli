---
id: feat
title: shep feat
---

# `shep feat`

Create and manage features — the primary way to kick off automated development work.

## Synopsis

```bash
shep feat [subcommand] [options]
shep feat "<description>"
```

## Subcommands

### `shep feat <description>`

Create a new feature from a natural language description.

```bash
shep feat "Add pagination to the user list endpoint"
```

Shep will:
1. Parse the description and create a feature spec
2. Start the agent pipeline on a new branch
3. Stream progress to your terminal

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--branch <name>` | Custom branch name | Auto-generated |
| `--no-commit` | Don't commit automatically | `false` |
| `--dry-run` | Preview without executing | `false` |
| `--repo <path>` | Path to target repository | Current directory |

### `shep feat list`

List all features in the current repository.

```bash
shep feat list
```

**Options:**

| Option | Description |
|--------|-------------|
| `--status <status>` | Filter by status (`pending`, `in_progress`, `review`, `complete`) |
| `--json` | Output as JSON |

### `shep feat show <id>`

Show details for a specific feature.

```bash
shep feat show 001
```

### `shep feat run <id>`

Run or re-run a feature's agent pipeline.

```bash
shep feat run 001
```

### `shep feat status <id>`

Check the current status of a feature.

```bash
shep feat status 001
```

## Examples

```bash
# Implement a new feature
shep feat "Add email verification to the signup flow"

# Fix a bug
shep feat "Fix the 500 error when deleting a user with active sessions"

# Refactor
shep feat "Extract database connection logic into a singleton service"

# On a specific repo
shep feat "Add API rate limiting" --repo ~/projects/my-api
```
