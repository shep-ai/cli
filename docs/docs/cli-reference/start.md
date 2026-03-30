---
id: start
title: shep start
---

# `shep start`

Start Shep background services, including the web UI server and any configured daemon processes.

## Synopsis

```bash
shep start [service] [options]
```

## Description

`shep start` launches Shep's background services so they run persistently without an active terminal session.

By default, it starts all configured services. You can optionally specify a specific service to start.

## Services

| Service | Description |
|---------|-------------|
| `ui` | Web UI server |
| `all` | All services (default) |

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port <number>` | Port for the UI service | `3000` |
| `--host <address>` | Bind address | `localhost` |
| `--verbose` | Show startup logs | `false` |

## Examples

```bash
# Start all services
shep start

# Start only the UI
shep start ui

# Start on a custom port
shep start ui --port 8080
```

## Checking Service Status

```bash
shep status
```

## Stopping Services

```bash
shep stop
shep stop ui
```

## Auto-start on Login

To configure Shep services to start automatically, see [Configuration](/getting-started/configuration) for details on the `daemon.autostart` setting.
