# CLI Commands Reference

Quick reference for all Shep AI CLI commands. For detailed documentation, see [docs/cli/commands.md](../cli/commands.md).

## Commands

### `shep version`

Show version information.

```bash
shep version
```

### `shep settings`

Manage global application settings.

| Subcommand            | Description                       |
| --------------------- | --------------------------------- |
| `shep settings show`  | Display current settings          |
| `shep settings init`  | Initialize settings interactively |
| `shep settings agent` | Configure agent type and auth     |
| `shep settings ide`   | Configure IDE preference          |

### `shep ui`

Launch the web UI.

```bash
shep ui
```

### `shep run`

Run the agent on the current repository.

```bash
shep run
```

### `shep agent`

Manage running agents.

| Subcommand                | Description          |
| ------------------------- | -------------------- |
| `shep agent ls`           | List agents          |
| `shep agent show <id>`    | Show agent details   |
| `shep agent logs <id>`    | View agent logs      |
| `shep agent approve <id>` | Approve agent action |
| `shep agent reject <id>`  | Reject agent action  |
| `shep agent delete <id>`  | Delete an agent      |
| `shep agent stop <id>`    | Stop a running agent |

### `shep feat`

Manage features.

| Subcommand               | Description          |
| ------------------------ | -------------------- |
| `shep feat new`          | Create a new feature |
| `shep feat ls`           | List features        |
| `shep feat show <id>`    | Show feature details |
| `shep feat logs <id>`    | View feature logs    |
| `shep feat resume <id>`  | Resume a feature     |
| `shep feat review <id>`  | Review a feature     |
| `shep feat approve <id>` | Approve a feature    |
| `shep feat reject <id>`  | Reject a feature     |
| `shep feat del <id>`     | Delete a feature     |

### `shep ide-open`

Open the IDE for the current repository.

```bash
shep ide-open
```

### `shep install`

Install dependencies for the project.

```bash
shep install
```

### `shep upgrade`

Upgrade the Shep CLI to the latest version.

```bash
shep upgrade
```

---

## Maintaining This Document

**Update when:**

- New commands are added
- Command options change
- Subcommands are added or removed

**Related docs:**

- [docs/cli/commands.md](../cli/commands.md) - Detailed command documentation
- [getting-started.md](./getting-started.md) - Basic usage
