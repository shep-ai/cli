---
id: stop
title: shep stop
---

# `shep stop`

Stop Shep background services.

## Synopsis

```bash
shep stop [service] [options]
```

## Description

`shep stop` gracefully shuts down Shep's background services. Running agent sessions are preserved and can be resumed later.

## Services

| Service | Description |
|---------|-------------|
| `ui` | Web UI server |
| `all` | All services (default) |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--force` | Force stop without graceful shutdown | `false` |
| `--timeout <seconds>` | Graceful shutdown timeout | `30` |

## Examples

```bash
# Stop all services
shep stop

# Stop only the UI
shep stop ui

# Force stop
shep stop --force
```

## Checking Status After Stop

```bash
shep status
```

## Related Commands

- [`shep start`](./start) — start services
- [`shep restart`](./restart) — restart services
- [`shep status`](./status) — check service status
