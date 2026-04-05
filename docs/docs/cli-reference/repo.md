---
id: repo
title: shep repo
---

# `shep repo`

Manage repositories that Shep works with. Register repos, configure per-repo settings, and inspect repository state.

## Synopsis

```bash
shep repo [subcommand] [options]
```

## Subcommands

### `shep repo add <path>`

Register a repository with Shep.

```bash
shep repo add ~/projects/my-app
shep repo add . --name my-app
```

**Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Friendly name for the repo |
| `--default-branch <branch>` | Override the default base branch |

### `shep repo list`

List all registered repositories.

```bash
shep repo list
```

### `shep repo info [path]`

Show information about a repository, including registered settings and active features.

```bash
shep repo info
shep repo info ~/projects/my-app
```

### `shep repo remove <name>`

Remove a repository from Shep's registry.

```bash
shep repo remove my-app
```

## Examples

```bash
# Register the current directory
shep repo add .

# Register a specific path with a name
shep repo add ~/projects/api-server --name api-server

# List all registered repos
shep repo list

# Show info about the current repo
shep repo info
```
