---
id: status
title: shep status
---

# `shep status`

Show the current status of Shep services, active agents, and running features.

## Synopsis

```bash
shep status [options]
```

## Description

`shep status` gives you a quick overview of:

- Which background services are running (UI server, etc.)
- Active agent sessions and their current state
- Features currently in progress
- Connection status for AI provider and GitHub

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--json` | Output as JSON | `false` |
| `--verbose` | Show additional details | `false` |
| `--watch` | Continuously refresh the status display | `false` |

## Example Output

```
Shep v1.2.3

Services:
  ✓ UI server       running on http://localhost:3000
  ✓ AI provider     anthropic (claude-opus-4-5)
  ✓ GitHub          authenticated as @your-username

Active Features:
  003  feat/003-add-rate-limiting     in_progress  code-developer running
  007  feat/007-fix-auth-bug          review       awaiting review

Active Sessions:
  abc123  code-developer  attached  ~/projects/my-app
```

## Examples

```bash
# Show status
shep status

# Watch status (refresh every 2s)
shep status --watch

# Get JSON output for scripting
shep status --json
```

## Related Commands

- [`shep start`](./start) — start services
- [`shep stop`](./stop) — stop services
- [`shep restart`](./restart) — restart services
