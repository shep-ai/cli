---
id: tools
title: shep tools
---

# `shep tools`

List, inspect, and configure the tools available to Shep agents. Tools are the capabilities agents use to interact with your codebase and environment.

## Synopsis

```bash
shep tools [subcommand] [options]
```

## Subcommands

### `shep tools list`

List all available tools.

```bash
shep tools list
```

**Options:**

| Option | Description |
|--------|-------------|
| `--enabled` | Show only currently enabled tools |
| `--agent <name>` | Show tools for a specific agent |
| `--json` | Output as JSON |

### `shep tools info <tool-name>`

Show detailed information about a specific tool.

```bash
shep tools info read-file
shep tools info bash
```

### `shep tools enable <tool-name>`

Enable a tool for agents.

```bash
shep tools enable browser
```

### `shep tools disable <tool-name>`

Disable a tool.

```bash
shep tools disable bash
```

## Built-in Tools

| Tool | Description |
|------|-------------|
| `read` | Read files from the repository |
| `write` | Write and create files |
| `edit` | Make targeted edits to files |
| `bash` | Execute shell commands |
| `grep` | Search file contents |
| `glob` | Find files by pattern |
| `web-fetch` | Fetch content from URLs |
| `web-search` | Search the web |

## Tool Permissions

You can configure which tools each agent has access to in `.shep/agents.json`:

```json
{
  "agents": {
    "code-reviewer": {
      "tools": ["read", "grep", "glob"]
    }
  }
}
```

Restricting tools to the minimum needed for each agent's role is a good security and reliability practice.

## Examples

```bash
# See all available tools
shep tools list

# Check what tools the reviewer uses
shep tools list --agent code-reviewer

# Get details on the bash tool
shep tools info bash
```
