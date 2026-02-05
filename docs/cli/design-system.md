# CLI Design System

All UI utilities live in `src/presentation/cli/ui/` and are barrel-exported from `ui/index.ts`.

```typescript
import {
  colors,
  symbols,
  fmt,
  messages,
  TableFormatter,
  OutputFormatter,
} from '@/presentation/cli/ui';
```

## Colors (`ui/colors.ts`)

Semantic color palette built on **picocolors** (not chalk). Respects the `NO_COLOR` environment variable automatically.

| Name             | Color   | Usage                         |
| ---------------- | ------- | ----------------------------- |
| `colors.brand`   | cyan    | Primary brand, headings, code |
| `colors.success` | green   | Success states                |
| `colors.error`   | red     | Error states                  |
| `colors.warning` | yellow  | Warning states                |
| `colors.info`    | blue    | Informational                 |
| `colors.muted`   | gray    | Secondary text, labels, debug |
| `colors.accent`  | magenta | Highlights                    |

```typescript
console.log(colors.success('Done')); // green text
console.log(colors.muted('v0.1.0')); // gray text
```

## Symbols (`ui/symbols.ts`)

Unicode symbols with ASCII fallbacks for non-UTF8 terminals. Detection checks `WT_SESSION`, `TERM_PROGRAM`, `TERM`, and Windows-specific indicators.

| Name               | Unicode        | ASCII    | Usage              |
| ------------------ | -------------- | -------- | ------------------ |
| `symbols.success`  | `\u2713`       | `\u221a` | Success checkmark  |
| `symbols.error`    | `\u2717`       | `\u00d7` | Error cross        |
| `symbols.warning`  | `\u26a0`       | `\u203c` | Warning triangle   |
| `symbols.info`     | `\u2139`       | `i`      | Info circle        |
| `symbols.arrow`    | `\u2192`       | `->`     | Arrow/pointer      |
| `symbols.bullet`   | `\u2022`       | `*`      | Bullet point       |
| `symbols.pointer`  | `\u276f`       | `>`      | Pointer right      |
| `symbols.ellipsis` | `\u2026`       | `...`    | Loading/truncation |
| `symbols.line`     | `\u2500`       | `-`      | Line separator     |
| `symbols.spinner`  | braille frames | `\|/-\\` | Loading animation  |

## Formatters (`ui/formatters.ts`)

Text formatting functions via picocolors. Accessed as `fmt.<name>`.

### Base modifiers

| Name            | Effect                     |
| --------------- | -------------------------- |
| `fmt.bold`      | Bold text                  |
| `fmt.dim`       | Dimmed text                |
| `fmt.italic`    | Italic text                |
| `fmt.underline` | Underlined text            |
| `fmt.inverse`   | Swap foreground/background |

### Semantic formatters

| Name                | Style               | Usage                        |
| ------------------- | ------------------- | ---------------------------- |
| `fmt.heading(text)` | bold + cyan         | Section titles               |
| `fmt.code(text)`    | cyan                | Commands, code references    |
| `fmt.label(text)`   | bold + gray         | Key/label in key-value pairs |
| `fmt.value(text)`   | no-op (passthrough) | Values in key-value pairs    |
| `fmt.version(text)` | gray, prepends `v`  | Version display              |

```typescript
console.log(fmt.heading('Settings')); // bold cyan
console.log(`${fmt.label('Node:')} ${process.version}`);
console.log(fmt.version('0.1.0')); // gray "v0.1.0"
```

## Messages (`ui/messages.ts`)

Pre-styled output functions that combine symbols + colors. All write to stdout except `messages.error` which writes to stderr.

| Function                     | Symbol    | Color  | Output              |
| ---------------------------- | --------- | ------ | ------------------- |
| `messages.success(text)`     | checkmark | green  | stdout              |
| `messages.error(text, err?)` | cross     | red    | stderr              |
| `messages.warning(text)`     | triangle  | yellow | stdout              |
| `messages.info(text)`        | info      | blue   | stdout              |
| `messages.debug(text)`       | pointer   | gray   | stdout (DEBUG only) |
| `messages.newline()`         | --        | --     | blank line          |
| `messages.log(text)`         | --        | --     | raw text            |

`messages.error()` accepts an optional `Error` parameter. The stack trace is only printed when the `DEBUG` environment variable is set.

`messages.debug()` is a no-op unless `DEBUG` is set.

```typescript
messages.success('Repository initialized'); // "checkmark Repository initialized"
messages.error('Connection failed', err); // "cross Connection failed" (+ stack in debug)
messages.warning('File not found'); // "warning-triangle File not found"
```

## Output Formatting (`ui/output.ts`)

`OutputFormatter` is a static class that formats data in three formats via `OutputFormatter.format(data, format)`.

```typescript
type OutputFormat = 'table' | 'json' | 'yaml';
```

| Format  | Implementation                                  | Library    |
| ------- | ----------------------------------------------- | ---------- |
| `table` | `TableFormatter.createSettingsTable()`          | cli-table3 |
| `json`  | `JSON.stringify(data, null, 2)`                 | built-in   |
| `yaml`  | `yaml.dump(data, { indent: 2, lineWidth: -1 })` | js-yaml    |

Used by `settings show --output <format>`.

## Tables (`ui/tables.ts`)

`TableFormatter` uses **cli-table3** to render structured data.

### Settings Table

`TableFormatter.createSettingsTable(settings)` renders a two-column table with four sections:

| Section     | Fields                                 |
| ----------- | -------------------------------------- |
| Models      | analyze, requirements, plan, implement |
| User        | name, email, githubUsername            |
| Environment | defaultEditor, shellPreference         |
| System      | autoUpdate, logLevel                   |

Section headers span both columns (centered). Optional user fields display `(not set)` when null. Boolean values are stringified.

Table style is minimal: `{ head: [], border: [] }` (no colors on headers/borders from cli-table3 itself).

### Adding a new table

1. Add a static method to `TableFormatter` (e.g., `createFeatureTable()`).
2. Create a `new Table()` with desired options.
3. Push rows with `table.push(...)`.
4. Return the table instance; caller calls `.toString()`.

## Conventions

- All commands must use the `ui/` utilities for output -- never call picocolors or cli-table3 directly from command files.
- Use `messages.*` for status feedback (success, error, warning, info).
- Use `fmt.*` for inline text styling within custom output.
- Use `OutputFormatter` when a command supports `--output` format switching.
- Database metadata (path, size) is shown below the table in `settings show` table mode only.
