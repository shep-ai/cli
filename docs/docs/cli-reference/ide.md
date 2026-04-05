---
id: ide
title: shep ide
---

# `shep ide`

Launch IDE integration for AI-powered coding directly within your editor.

## Synopsis

```bash
shep ide [subcommand] [options]
```

## Usage

```bash
# Launch IDE integration (auto-detects installed IDE)
shep ide

# Open in a specific IDE
shep ide --editor cursor
shep ide --editor vscode
```

## Subcommands

### `shep ide open`

Open the current repository in an IDE with Shep integration active.

```bash
shep ide open
shep ide open ~/projects/my-app
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--editor <name>` | IDE to launch (`cursor`, `vscode`, `windsurf`) | Auto-detect |
| `--feature <id>` | Open with a specific feature branch checked out | — |

### `shep ide list`

List detected IDEs on your system.

```bash
shep ide list
```

### `shep ide config`

Configure IDE integration settings.

```bash
shep ide config
```

## Supported IDEs

| IDE | Identifier | Notes |
|-----|-----------|-------|
| Cursor | `cursor` | Full AI integration |
| VS Code | `vscode` | Extension-based integration |
| Windsurf | `windsurf` | Full AI integration |

## Examples

```bash
# Auto-detect and launch IDE
shep ide

# Open a specific feature in Cursor
shep ide open --editor cursor --feature 005

# Check what IDEs are installed
shep ide list
```
