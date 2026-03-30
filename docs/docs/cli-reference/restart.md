---
id: restart
title: shep restart
---

# `shep restart`

Restart Shep background services. Equivalent to `shep stop` followed by `shep start`.

## Synopsis

```bash
shep restart [service] [options]
```

## Description

`shep restart` performs a graceful restart of Shep's services. This is useful after updating configuration or after a service becomes unresponsive.

## Services

| Service | Description |
|---------|-------------|
| `ui` | Web UI server |
| `all` | All services (default) |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--force` | Force stop before restarting | `false` |
| `--timeout <seconds>` | Graceful shutdown timeout | `30` |

## Examples

```bash
# Restart all services
shep restart

# Restart only the UI
shep restart ui

# Force restart
shep restart --force
```

## When to Restart

Restart Shep services when:
- You've updated configuration via `shep settings`
- A service appears unresponsive
- After upgrading Shep (`shep upgrade`)

## Related Commands

- [`shep start`](./start) — start services
- [`shep stop`](./stop) — stop services
- [`shep status`](./status) — check service status
