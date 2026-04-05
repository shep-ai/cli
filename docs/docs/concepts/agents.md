---
id: agents
title: Agents
sidebar_position: 4
---

# Agents

**Agents** are the AI workers that power Shep. Each agent is a specialized AI process with a focused role in the SDLC pipeline.

## Built-in Agents

### Code Explorer

Analyzes the codebase to build context before implementation begins.

- Reads relevant files and traces execution paths
- Maps architecture and abstractions
- Identifies patterns, conventions, and style
- Produces a research summary for downstream agents

### Code Architect

Designs the implementation approach based on the feature spec and research.

- Creates a step-by-step implementation plan
- Identifies which files to create or modify
- Considers trade-offs and architectural fit
- Writes a plan document for the developer agent

### Code Developer

Writes the actual code following the architect's plan.

- Reads and edits source files
- Follows existing patterns and conventions
- Runs tests and fixes failures
- Commits changes incrementally

### Code Reviewer

Reviews the implementation for quality and correctness.

- Checks for bugs and logic errors
- Verifies spec compliance
- Flags style issues and code smells
- Produces a review report

## Agent Configuration

Agents are configured per-project in `.shep/agents.json`. You can customize:

- Which agents to include in the pipeline
- Tool access permissions per agent
- Model and temperature settings
- Maximum steps and timeout

## Running Agents Directly

You can invoke an agent directly without a feature:

```bash
shep agent run code-explorer --prompt "Explain the authentication flow in this codebase"
```

List available agents:

```bash
shep agent list
```

View agent status:

```bash
shep agent status
```

## Tools

Agents use **tools** to interact with your codebase and environment — reading files, running commands, searching code, and more. See [Tools](/cli-reference/tools) for the full list of available tools.
