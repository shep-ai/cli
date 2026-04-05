---
id: install
title: shep install
---

# `shep install`

Run the interactive setup wizard to configure Shep for first use or reset your configuration.

## Synopsis

```bash
shep install [options]
```

## Description

`shep install` walks you through initial configuration:

1. **AI Provider** — choose your provider (Anthropic, OpenAI) and enter your API key
2. **GitHub Integration** — enter your GitHub personal access token for repo and PR operations
3. **Default Settings** — configure agent behavior, UI preferences, and defaults
4. **Verification** — test the configuration to ensure everything is working

## Options

| Option | Description |
|--------|-------------|
| `--reset` | Reset all settings before running setup |
| `--provider <name>` | Skip provider selection, use specified provider |
| `--skip-github` | Skip GitHub token setup |
| `--yes`, `-y` | Accept all defaults without prompting |

## Examples

```bash
# Run the full setup wizard
shep install

# Re-run setup and reset existing config
shep install --reset

# Quick setup with defaults (non-interactive)
shep install --yes
```

## What Gets Configured

After running `shep install`, the following are saved to `~/.shep/config.json`:

- AI provider and API key
- GitHub token
- Default model
- UI port and host settings
- Agent behavior defaults

## After Installation

Once setup is complete, verify everything is working:

```bash
shep status
shep version
```

Then navigate to your project and run your first feature:

```bash
cd ~/projects/my-app
shep feat "Describe what you want to build"
```
