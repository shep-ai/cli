# TUI Documentation

Reference documentation for the Shep AI TUI (Terminal UI) presentation layer.

## Overview

The TUI layer provides interactive terminal wizards using [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js). Wizards are invoked from CLI commands when multi-step interactive input is needed (e.g., agent configuration, initialization flows).

The TUI is not a standalone presentation layer but integrates with CLI commands — a command determines when a wizard is needed and delegates to the TUI layer for interactive prompts.

## Documents

| Document                               | Description                                             |
| -------------------------------------- | ------------------------------------------------------- |
| [architecture.md](./architecture.md)   | Wizard structure, prompt patterns, integration with CLI |
| [design-system.md](./design-system.md) | Prompt styling, themes, consistent UX patterns          |

## Quick Reference

### File Layout

```
src/presentation/tui/
  index.ts                          # Barrel export
  wizards/
    agent-config.wizard.ts          # Agent selection + auth wizard
  prompts/
    agent-select.prompt.ts          # Agent selection prompt config
    auth-method.prompt.ts           # Auth method selection
  themes/
    shep.theme.ts                   # Custom Inquirer theme (colors, symbols)
```

### Available Wizards

| Wizard                | Invoked By            | Description                      |
| --------------------- | --------------------- | -------------------------------- |
| `agentConfigWizard()` | `shep settings agent` | Select AI agent + configure auth |

### Prompt Types Used

| Prompt     | Package              | Purpose                                                        |
| ---------- | -------------------- | -------------------------------------------------------------- |
| `select`   | `@inquirer/select`   | Single-choice selection with descriptions and disabled options |
| `confirm`  | `@inquirer/confirm`  | Yes/no confirmation                                            |
| `password` | `@inquirer/password` | Masked sensitive input (API tokens)                            |
| `input`    | `@inquirer/input`    | Free-form text input                                           |
