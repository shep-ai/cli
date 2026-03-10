# CLI Documentation

Reference documentation for the Shep AI CLI presentation layer.

## Overview

The CLI is built with [Commander.js](https://github.com/tj/commander.js/) and follows Clean Architecture principles. Commands live in `src/presentation/cli/commands/`, UI utilities in `src/presentation/cli/ui/`, and the entry point is `src/presentation/cli/index.ts`.

Bootstrap initializes the DI container (database + migrations), loads settings into the in-memory singleton, runs the onboarding wizard on first launch (TTY only), then configures Commander and parses arguments. The default action (no subcommand) starts the web UI daemon.

## Documents

| Document                               | Description                                                          |
| -------------------------------------- | -------------------------------------------------------------------- |
| [architecture.md](./architecture.md)   | Command structure, file organization, DI integration, error handling |
| [design-system.md](./design-system.md) | Colors, symbols, formatters, messages, output formats, tables        |
| [commands.md](./commands.md)           | Command reference with usage examples                                |

## Quick Reference

### File Layout

```
src/presentation/cli/
  index.ts                          # Entry point, bootstrap()
  commands/
    version.command.ts              # shep version
    run.command.ts                  # shep run
    ui.command.ts                   # shep ui
    upgrade.command.ts              # shep upgrade
    start.command.ts                # shep start (daemon)
    stop.command.ts                 # shep stop (daemon)
    restart.command.ts              # shep restart (daemon)
    status.command.ts               # shep status (daemon)
    _serve.command.ts               # shep serve (hidden, internal)
    install.command.ts              # shep install
    ide-open.command.ts             # shep ide-open
    tools.command.ts                # shep tools (group)
    log-viewer.ts                   # Log viewing utility
    settings/
      index.ts                     # settings command group (wizard default)
      show.command.ts              # shep settings show
      init.command.ts              # shep settings init
      agent.command.ts             # shep settings agent
      ide.command.ts               # shep settings ide
      workflow.command.ts          # shep settings workflow
      model.command.ts             # shep settings model
    feat/
      index.ts                     # feat command group
      new.command.ts               # shep feat new
      ls.command.ts                # shep feat ls
      show.command.ts              # shep feat show
      del.command.ts               # shep feat del
      resume.command.ts            # shep feat resume
      review.command.ts            # shep feat review
      approve.command.ts           # shep feat approve
      reject.command.ts            # shep feat reject
      logs.command.ts              # shep feat logs
    agent/
      index.ts                     # agent command group
      ls.command.ts                # shep agent ls
      show.command.ts              # shep agent show
      stop.command.ts              # shep agent stop
      logs.command.ts              # shep agent logs
      delete.command.ts            # shep agent delete
      approve.command.ts           # shep agent approve
      reject.command.ts            # shep agent reject
    repo/
      index.ts                     # repo command group
      ls.command.ts                # shep repo ls
      show.command.ts              # shep repo show
    session/
      index.ts                     # session command group
      ls.command.ts                # shep session ls
      show.command.ts              # shep session show
    daemon/
      start-daemon.ts              # Daemon start logic
      stop-daemon.ts               # Daemon stop logic
  ui/
    index.ts                       # Barrel export
    colors.ts                      # Semantic color palette (picocolors)
    symbols.ts                     # Unicode symbols with ASCII fallbacks
    formatters.ts                  # Text formatting utilities (fmt)
    messages.ts                    # Pre-styled message functions
    output.ts                      # OutputFormatter (table/json/yaml)
    tables.ts                      # TableFormatter (cli-table3)
    spinner.ts                     # Terminal spinner
    list-view.ts                   # List rendering utilities
    detail-view.ts                 # Detail view rendering
    install-messages.ts            # Tool installation messages
```

### Command Summary

| Command                      | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `shep`                       | Start daemon (or onboarding on first run)                 |
| `shep start`                 | Start the web UI as a background daemon                   |
| `shep stop`                  | Stop the running daemon                                   |
| `shep restart`               | Restart the daemon                                        |
| `shep status`                | Show daemon status and metrics                            |
| `shep ui`                    | Start web UI in foreground                                |
| `shep --version` / `-v`      | Version number only                                       |
| `shep version`               | Detailed version info (name, description, Node, platform) |
| `shep feat new`              | Create a new feature                                      |
| `shep feat ls`               | List all features                                         |
| `shep feat show`             | Show feature details                                      |
| `shep feat del`              | Delete a feature                                          |
| `shep feat resume`           | Resume a paused feature                                   |
| `shep feat review`           | Review a feature                                          |
| `shep feat approve`          | Approve a feature                                         |
| `shep feat reject`           | Reject a feature                                          |
| `shep feat logs`             | View feature logs                                         |
| `shep agent ls`              | List agent runs                                           |
| `shep agent show`            | Show agent run details                                    |
| `shep agent stop`            | Stop an agent                                             |
| `shep agent logs`            | View agent logs                                           |
| `shep agent delete`          | Delete an agent run                                       |
| `shep agent approve`         | Approve an agent action                                   |
| `shep agent reject`          | Reject an agent action                                    |
| `shep repo ls`               | List repositories                                         |
| `shep repo show`             | Show repository details                                   |
| `shep session ls`            | List sessions                                             |
| `shep session show`          | Show session details                                      |
| `shep settings`              | Launch full settings wizard                               |
| `shep settings show`         | Display settings (default: table)                         |
| `shep settings show -o json` | Display settings as JSON                                  |
| `shep settings show -o yaml` | Display settings as YAML                                  |
| `shep settings init`         | Reset settings to defaults (with confirmation)            |
| `shep settings init -f`      | Reset settings without confirmation                       |
| `shep settings agent`        | Configure AI agent                                        |
| `shep settings ide`          | Configure preferred IDE                                   |
| `shep settings workflow`     | Configure workflow defaults                               |
| `shep settings model`        | Configure default LLM model                               |
| `shep tools list`            | List available tools                                      |
| `shep install`               | Install a development tool                                |
| `shep ide-open`              | Open IDE for a repository                                 |
| `shep run`                   | Run an AI agent workflow                                  |
| `shep upgrade`               | Upgrade Shep CLI                                          |
