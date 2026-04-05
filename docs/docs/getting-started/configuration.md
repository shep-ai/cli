---
id: configuration
title: Configuration
sidebar_position: 3
---

# Configuration

Shep can be configured globally or per-project using the `shep settings` command or by editing the configuration file directly.

## Configuration File

Shep stores its configuration in `~/.shep/config.json` (global) and optionally `.shep/config.json` in your project root (project-level).

Project-level settings override global settings.

## Initial Setup

Run the interactive setup wizard:

```bash
shep install
```

## Managing Settings

View current settings:

```bash
shep settings
```

Update a specific setting:

```bash
shep settings set ai.provider anthropic
shep settings set ai.model claude-opus-4-5
```

## Key Configuration Options

### AI Provider

| Key | Description | Default |
|-----|-------------|---------|
| `ai.provider` | AI provider (`anthropic`, `openai`) | `anthropic` |
| `ai.model` | Model to use | `claude-opus-4-5` |
| `ai.apiKey` | API key (or use env var) | — |

### GitHub Integration

| Key | Description | Default |
|-----|-------------|---------|
| `github.token` | Personal access token | — |
| `github.defaultBranch` | Base branch for PRs | `main` |
| `github.autoPR` | Auto-create PRs on completion | `false` |

### Agent Behavior

| Key | Description | Default |
|-----|-------------|---------|
| `agent.maxSteps` | Max steps per agent run | `50` |
| `agent.autoCommit` | Auto-commit on completion | `true` |
| `agent.worktrees` | Use git worktrees for isolation | `true` |

### UI Server

| Key | Description | Default |
|-----|-------------|---------|
| `ui.port` | Web UI port | `3000` |
| `ui.host` | Bind address | `localhost` |
| `ui.autoOpen` | Open browser on start | `true` |

## Environment Variables

API keys can be set via environment variables to avoid storing secrets in config:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export GITHUB_TOKEN=ghp_...
```

## Per-Project Configuration

Create a `.shep/config.json` in your project root to override settings for that repo:

```json
{
  "agent": {
    "maxSteps": 100,
    "autoCommit": false
  },
  "github": {
    "defaultBranch": "develop"
  }
}
```
