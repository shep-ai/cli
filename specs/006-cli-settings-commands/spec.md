# Feature: cli-settings-commands

> Add CLI subcommands for managing Shep settings with rich output formatting

## Status

- **Number:** 006
- **Created:** 2026-02-05
- **Branch:** feat/006-cli-settings-commands
- **Phase:** Research

## Problem Statement

The Shep platform has a fully functional global settings service (feature 005) with domain models, use cases, and repository implementation. However, users have no way to interact with these settings from the CLI:

- **No visibility into settings** - Users cannot view current configuration without manually inspecting the SQLite database
- **No initialization control** - Users cannot manually trigger settings initialization or reset to defaults
- **No output formatting** - No standardized way to display structured data (tables, JSON, YAML) in the CLI
- **No CLI architecture documentation** - Unlike the web UI which has comprehensive architecture docs ([docs/ui/architecture.md](../../docs/ui/architecture.md)), the CLI lacks documented patterns for commands, output formatting, and structure

This feature provides the CLI interface layer for settings management and establishes architectural patterns for all future CLI commands:

- **`shep settings show`** - Display current settings with multiple output formats (table, JSON, YAML)
- **`shep settings init`** - Initialize or reset settings to defaults with confirmation prompts
- **CLI Design System** - Establish table formatting utilities for rich terminal output
- **CLI Architecture Documentation** - Document command patterns, output formatting, and structure (similar to web UI docs)

## Success Criteria

**Commands:**

- [ ] `shep settings show` displays all settings in a formatted table (default output)
- [ ] `shep settings show --output json` outputs settings as JSON
- [ ] `shep settings show --output yaml` outputs settings as YAML
- [ ] `shep settings show` includes database metadata (path, size, record count)
- [ ] `shep settings init` initializes settings with default values
- [ ] `shep settings init` prompts for confirmation before overwriting existing data (unless `--force`)
- [ ] `shep settings init --force` skips confirmation and forces re-initialization

**CLI Design System:**

- [ ] Table formatting utility added to `src/presentation/cli/ui/tables.ts`
- [ ] Consistent table styling using existing color scheme (from `ui/colors.ts`)
- [ ] Support for multi-column layouts, headers, and nested data
- [ ] Integration with existing CLI UI components (colors, formatters, messages)

**Documentation:**

- [ ] `docs/cli/README.md` - CLI documentation index (similar to `docs/ui/README.md`)
- [ ] `docs/cli/architecture.md` - Command patterns, structure, conventions
- [ ] `docs/cli/design-system.md` - Output formatting, tables, styling guidelines
- [ ] `docs/cli/commands.md` - Command reference and usage examples
- [ ] `CLAUDE.md` updated with CLI architecture section

**Testing:**

- [ ] Unit tests for settings command handlers (using mocked use cases)
- [ ] Unit tests for table formatting utilities
- [ ] Integration tests for command execution with real use cases
- [ ] E2E tests for `shep settings show` with different output formats
- [ ] E2E tests for `shep settings init` with and without `--force` flag

## Affected Areas

| Area                                      | Impact | Reasoning                                                   |
| ----------------------------------------- | ------ | ----------------------------------------------------------- |
| `src/presentation/cli/commands/settings/` | High   | New directory for settings subcommands (show, init)         |
| `src/presentation/cli/ui/tables.ts`       | High   | New table formatting utility for structured output          |
| `src/presentation/cli/ui/output.ts`       | High   | New output formatter supporting JSON/YAML/table formats     |
| `src/presentation/cli/ui/index.ts`        | Medium | Export new table and output utilities                       |
| `src/presentation/cli/index.ts`           | Medium | Register settings command with subcommands                  |
| `package.json`                            | Medium | Add dependencies: `cli-table3`, `js-yaml`, `@types/js-yaml` |
| `docs/cli/README.md`                      | High   | New CLI documentation index                                 |
| `docs/cli/architecture.md`                | High   | New CLI architecture patterns and conventions               |
| `docs/cli/design-system.md`               | High   | New CLI design system (output formatting, tables, styling)  |
| `docs/cli/commands.md`                    | High   | New command reference documentation                         |
| `CLAUDE.md`                               | Medium | Add CLI architecture section (parallel to Web UI section)   |
| `tests/unit/presentation/cli/commands/`   | High   | Unit tests for settings commands                            |
| `tests/unit/presentation/cli/ui/`         | High   | Unit tests for table and output utilities                   |
| `tests/integration/presentation/cli/`     | High   | Integration tests for settings commands                     |
| `tests/e2e/cli/settings-commands.test.ts` | High   | E2E tests for settings show/init commands                   |
| `src/infrastructure/services/filesystem/` | Low    | Potentially extend with database size/metadata utilities    |

## Dependencies

| Feature                     | Status   | Why Needed                                                |
| --------------------------- | -------- | --------------------------------------------------------- |
| 005-global-settings-service | Complete | Provides Settings domain model, use cases, and repository |

**Blocks:**

- Future CLI commands requiring structured output (tables, JSON, YAML)
- Future CLI commands interacting with settings (e.g., `shep config set`)
- Any feature requiring CLI architecture documentation reference

## Size Estimate

**M (Medium)** - This feature establishes foundational CLI patterns but is well-scoped:

- **Two subcommands** - `show` and `init` with clear requirements
- **Output formatting** - Table, JSON, YAML with reusable utilities
- **CLI design system** - New table formatter and output utilities
- **Comprehensive documentation** - 4 new docs files establishing CLI architecture patterns
- **Testing coverage** - Unit, integration, and E2E tests across all layers
- **3 new dependencies** - cli-table3, js-yaml, @types/js-yaml
- **~15-18 new files** across presentation, tests, and docs directories
- **Reuses existing infrastructure** - Settings use cases and repository already exist

## Open Questions

All questions resolved in research phase. See [research.md](./research.md) for decisions.

**Decisions:**

- [x] **Table library** → cli-table3 (most popular, best features)
- [x] **YAML library** → js-yaml (proven stability, fast reading)
- [x] **Database metrics** → path, size, schema version, last modified, record count
- [x] **Section filtering** → Defer to future (not in MVP)
- [x] **Backup strategy** → No automatic backups (confirmation prompt with warning)
- [x] **Interactive mode** → Defer to future (sensible defaults sufficient)

---

_Generated by `/shep-kit:new-feature` — proceed with `/shep-kit:research`_
