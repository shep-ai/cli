# CLI Command Reference

## Global Options

| Option          | Description                     |
| --------------- | ------------------------------- |
| `-v, --version` | Display version number and exit |
| `-h, --help`    | Display help and exit           |

Running `shep` with no arguments displays help.

---

## `shep version`

Display detailed version information.

**Source**: `src/presentation/cli/commands/version.command.ts`

```
$ shep version

@shepai/cli v0.1.0
Autonomous AI Native SDLC Platform

Node:     v20.10.0
Platform: linux x64
```

Output includes package name, version (via `VersionService`), description, Node.js version, and OS platform/arch.

---

## `shep settings`

Command group for managing global settings. Running `shep settings` without a subcommand displays subcommand help.

**Source**: `src/presentation/cli/commands/settings/index.ts`

### `shep settings show`

Display current settings.

**Source**: `src/presentation/cli/commands/settings/show.command.ts`

**Options**:

| Option                  | Description                            | Default |
| ----------------------- | -------------------------------------- | ------- |
| `-o, --output <format>` | Output format: `table`, `json`, `yaml` | `table` |

**Examples**:

```bash
# Table format (default)
shep settings show

# JSON format
shep settings show --output json

# YAML format (short flag)
shep settings show -o yaml
```

**Table output** renders four sections (Models, User, Environment, System) followed by database metadata (path, file size). Optional user fields show `(not set)` when null.

**JSON/YAML output** prints the raw Settings object without database metadata.

**Data source**: Reads from the in-memory settings singleton via `getSettings()`.

**Error handling**: Catches errors, prints via `messages.error()`, sets `process.exitCode = 1`.

### `shep settings init`

Reset settings to defaults. Creates a fresh `Settings` object from `createDefaultSettings()`, resets the in-memory singleton, and re-initializes it.

**Source**: `src/presentation/cli/commands/settings/init.command.ts`

**Options**:

| Option        | Description              |
| ------------- | ------------------------ |
| `-f, --force` | Skip confirmation prompt |

**Examples**:

```bash
# With confirmation prompt
shep settings init

# Skip confirmation
shep settings init --force
shep settings init -f
```

**Behavior**:

- Without `--force`: Prints a warning about data loss, prompts `Are you sure? (y/N):`. Only `y` (case-insensitive) confirms. EOF on stdin resolves to `false` (safe default).
- With `--force`: Skips confirmation, resets immediately.
- On success: Prints `messages.success('Settings initialized to defaults.')`.
- On cancel: Prints `messages.info('Operation cancelled.')`.

**Data flow**: `createDefaultSettings()` -> `resetSettings()` -> `initializeSettings(newSettings)`.

**Error handling**: Same pattern as `settings show`.

---

## Adding a New Command

1. Create `src/presentation/cli/commands/<name>.command.ts` (or `<group>/<name>.command.ts` for subcommands).
2. Export `create<Name>Command(): Command` factory function.
3. Add options, help text, and action handler following the patterns above.
4. Register in `index.ts` via `program.addCommand(create<Name>Command())`.
5. For command groups, create an `index.ts` that uses `.addCommand()` to compose subcommands.
6. Use `messages.*` for feedback, `OutputFormatter` for multi-format output, `process.exitCode = 1` for errors.
