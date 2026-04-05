---
id: upgrade
title: shep upgrade
---

# `shep upgrade`

Upgrade Shep to the latest version.

## Synopsis

```bash
shep upgrade [options]
```

## Description

`shep upgrade` checks for a newer version and installs it if available. After upgrading, background services are automatically restarted.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--check` | Check for updates without installing | `false` |
| `--version <version>` | Install a specific version | Latest |
| `--yes`, `-y` | Skip confirmation prompt | `false` |
| `--force` | Reinstall even if already on latest version | `false` |

## Examples

```bash
# Upgrade to the latest version
shep upgrade

# Check if an update is available (don't install)
shep upgrade --check

# Upgrade without prompting
shep upgrade --yes

# Install a specific version
shep upgrade --version 1.2.0
```

## Example Output

```
Current version: v1.1.0
Latest version:  v1.2.3

Upgrade available! Installing v1.2.3...
✓ Downloaded
✓ Installed
✓ Services restarted

Shep upgraded from v1.1.0 → v1.2.3
```

## After Upgrading

Check the release notes for breaking changes and new features:

```
https://github.com/shep-ai/shep/releases
```

Verify the upgrade:

```bash
shep version
```
