# CLI Commands Reference

Complete reference for all Shep AI CLI commands.

## Global Options

These options work with any command:

| Option | Description |
|--------|-------------|
| `--version`, `-v` | Show version number |
| `--help`, `-h` | Show help |
| `--verbose` | Enable verbose output |
| `--quiet`, `-q` | Suppress non-essential output |
| `--config <path>` | Use specific config file |

## Commands

### `shep` (default)

Start Shep in the current directory.

```bash
shep [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--init` | Force initialization even if already configured |
| `--port <number>` | Specify web UI port (default: 3030) |
| `--no-browser` | Don't open browser automatically |
| `--shallow` | Use shallow analysis (faster) |

**Examples:**

```bash
# Start normally
shep

# Start on different port
shep --port 8080

# Force re-initialization
shep --init

# Start without opening browser
shep --no-browser
```

### `shep init`

Initialize Shep in a repository without starting the server.

```bash
shep init [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--force` | Reinitialize even if already configured |
| `--shallow` | Use shallow repository analysis |

**Examples:**

```bash
# Initialize
shep init

# Force reinitialize
shep init --force
```

### `shep auth`

Configure authentication.

```bash
shep auth [command]
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| `shep auth` | Interactive authentication setup |
| `shep auth status` | Show current auth status |
| `shep auth reset` | Clear stored credentials |
| `shep auth token <key>` | Set API token directly |

**Examples:**

```bash
# Interactive setup
shep auth

# Check status
shep auth status

# Set token directly
shep auth token sk-ant-xxx

# Reset credentials
shep auth reset
```

### `shep analyze`

Run or manage repository analysis.

```bash
shep analyze [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--fresh` | Force fresh analysis (ignore cache) |
| `--perspective <name>` | Run specific perspective only |
| `--output <path>` | Custom output directory |

**Examples:**

```bash
# Run full analysis
shep analyze

# Fresh analysis
shep analyze --fresh

# Only architecture analysis
shep analyze --perspective architecture

# Custom output
shep analyze --output ./my-analysis
```

### `shep status`

Show current Shep status for the repository.

```bash
shep status [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--json` | Output as JSON |

**Output includes:**
- Analysis status and age
- Active features and their lifecycle states
- Server status (if running)

**Examples:**

```bash
# Human-readable status
shep status

# JSON output for scripting
shep status --json
```

### `shep feature`

Manage features.

```bash
shep feature <command> [options]
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| `shep feature list` | List all features |
| `shep feature show <id>` | Show feature details |
| `shep feature create <name>` | Create new feature (CLI mode) |
| `shep feature delete <id>` | Delete a feature |
| `shep feature export <id>` | Export feature data |

**Examples:**

```bash
# List features
shep feature list

# Show feature details
shep feature show feat_abc123

# Create feature (opens requirements gathering)
shep feature create "Add user profiles"

# Delete feature
shep feature delete feat_abc123

# Export to JSON
shep feature export feat_abc123 > feature.json
```

### `shep config`

Manage configuration.

```bash
shep config <command> [options]
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| `shep config list` | Show all configuration |
| `shep config get <key>` | Get specific config value |
| `shep config set <key> <value>` | Set config value |
| `shep config reset [key]` | Reset config to default |
| `shep config edit` | Open config in editor |

**Examples:**

```bash
# List all config
shep config list

# Get specific value
shep config get server.port

# Set value
shep config set server.port 8080

# Reset specific
shep config reset server.port

# Reset all
shep config reset --all

# Edit in default editor
shep config edit
```

### `shep server`

Manage the web server.

```bash
shep server <command> [options]
```

**Subcommands:**

| Command | Description |
|---------|-------------|
| `shep server start` | Start web server |
| `shep server stop` | Stop running server |
| `shep server status` | Check server status |
| `shep server restart` | Restart server |

**Options:**

| Option | Description |
|--------|-------------|
| `--port <number>` | Specify port |
| `--daemon` | Run in background |

**Examples:**

```bash
# Start in foreground
shep server start

# Start as daemon
shep server start --daemon

# Check status
shep server status

# Stop daemon
shep server stop
```

### `shep logs`

View Shep logs.

```bash
shep logs [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--follow`, `-f` | Follow log output |
| `--lines <n>` | Show last n lines |
| `--level <level>` | Filter by log level |

**Examples:**

```bash
# View recent logs
shep logs

# Follow logs
shep logs -f

# Last 50 lines
shep logs --lines 50

# Only errors
shep logs --level error
```

### `shep clean`

Clean Shep data.

```bash
shep clean [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--analysis` | Clean analysis data only |
| `--features` | Clean feature data only |
| `--all` | Clean everything |
| `--force` | Skip confirmation |

**Examples:**

```bash
# Clean analysis (prompts for confirmation)
shep clean --analysis

# Clean everything without confirmation
shep clean --all --force
```

### `shep doctor`

Diagnose issues with Shep installation.

```bash
shep doctor
```

**Checks:**
- Node.js version
- npm version
- Authentication status
- Configuration validity
- Database integrity
- Network connectivity

**Example output:**

```
Shep Doctor
───────────

✓ Node.js version: v20.10.0 (required: ≥18)
✓ npm version: 10.2.0 (required: ≥9)
✓ Authentication: Valid token configured
✓ Configuration: Valid
✓ Database: Healthy
✓ Network: Claude API reachable

All checks passed!
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Authentication error |
| 4 | Network error |
| 5 | Database error |

## Shell Completion

Enable shell completion:

```bash
# Bash
shep completion bash >> ~/.bashrc

# Zsh
shep completion zsh >> ~/.zshrc

# Fish
shep completion fish > ~/.config/fish/completions/shep.fish
```

---

## Maintaining This Document

**Update when:**
- New commands are added
- Command options change
- Exit codes change
- Examples need updates

**Related docs:**
- [getting-started.md](./getting-started.md) - Basic usage
- [configuration.md](./configuration.md) - Config command details
