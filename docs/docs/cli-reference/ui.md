---
id: ui
title: shep ui
---

# `shep ui`

Launch the Shep web UI — a browser-based dashboard for monitoring agent sessions, reviewing features, and managing your workflow.

## Synopsis

```bash
shep ui [options]
```

## Description

The Shep UI provides a visual interface for everything you can do with the CLI:

- **Dashboard** — overview of active features and agent sessions
- **Sessions** — real-time view of agent activity with reasoning traces
- **Features** — browse, create, and manage features
- **Logs** — detailed agent logs and tool call history
- **Settings** — configuration UI

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--port <number>` | Port to listen on | `3000` |
| `--host <address>` | Bind address | `localhost` |
| `--no-open` | Don't auto-open the browser | `false` |
| `--detach`, `-d` | Run in background | `false` |

## Examples

```bash
# Start the UI and open the browser
shep ui

# Start on a different port
shep ui --port 8080

# Start in background (detached)
shep ui --detach

# Start without opening browser
shep ui --no-open
```

## Accessing the UI

By default, the UI is available at:

```
http://localhost:3000
```

If you started it on a different port:

```
http://localhost:<port>
```

## Stopping the UI

If running in the foreground, press `Ctrl+C`.

If running in background (detached):

```bash
shep stop ui
```

Or use the global stop command:

```bash
shep stop
```
