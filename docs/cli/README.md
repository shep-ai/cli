# CLI Documentation

Reference documentation for the Shep AI CLI presentation layer.

## Overview

The CLI is built with [Commander.js](https://github.com/tj/commander.js/) and follows Clean Architecture principles. Commands live in `src/presentation/cli/commands/`, UI utilities in `src/presentation/cli/ui/`, and the entry point is `src/presentation/cli/index.ts`.

Bootstrap initializes the DI container (database + migrations), loads settings into the in-memory singleton, then configures Commander and parses arguments.

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
    settings/
      index.ts                     # settings command group
      show.command.ts              # shep settings show
      init.command.ts              # shep settings init
  ui/
    index.ts                       # Barrel export
    colors.ts                      # Semantic color palette (picocolors)
    symbols.ts                     # Unicode symbols with ASCII fallbacks
    formatters.ts                  # Text formatting utilities (fmt)
    messages.ts                    # Pre-styled message functions
    output.ts                      # OutputFormatter (table/json/yaml)
    tables.ts                      # TableFormatter (cli-table3)
```

### Command Summary

| Command                      | Description                                               |
| ---------------------------- | --------------------------------------------------------- |
| `shep`                       | Show help                                                 |
| `shep --version` / `-v`      | Version number only                                       |
| `shep version`               | Detailed version info (name, description, Node, platform) |
| `shep settings show`         | Display settings (default: table)                         |
| `shep settings show -o json` | Display settings as JSON                                  |
| `shep settings show -o yaml` | Display settings as YAML                                  |
| `shep settings init`         | Reset settings to defaults (with confirmation)            |
| `shep settings init -f`      | Reset settings without confirmation                       |
