---
id: quick-start
title: Quick Start
sidebar_position: 2
---

# Quick Start

This guide walks you through implementing your first automated feature with Shep.

## 1. Navigate to Your Repository

```bash
cd /path/to/your/project
```

## 2. Implement a Feature

Use `shep feat` to describe the feature you want to build:

```bash
shep feat "Add a dark mode toggle to the settings page"
```

Shep will:
1. Analyze your codebase
2. Create a feature branch
3. Run AI agents to implement the changes
4. Commit the result

## 3. Monitor Progress

Open the Shep UI to watch agent activity in real time:

```bash
shep ui
```

Navigate to `http://localhost:3000` (or your configured port) to see:
- Active agent sessions
- Implementation progress
- Logs and reasoning traces

## 4. Review the Output

Once the feature is complete, review the generated branch:

```bash
git diff main
```

Or open a PR directly from the Shep UI.

## 5. Run a Session

For more interactive control, start a session:

```bash
shep session
```

Sessions let you guide the agent interactively — ask questions, provide context, or iterate on the implementation.

## Common Workflows

### Fix a Bug

```bash
shep feat "Fix the null pointer exception in UserService.getProfile()"
```

### Refactor Code

```bash
shep feat "Refactor the authentication module to use dependency injection"
```

### Add Tests

```bash
shep feat "Add unit tests for the PaymentProcessor class"
```

### Write Documentation

```bash
shep feat "Add JSDoc comments to all public API methods in src/api/"
```

## Next Steps

- [Configuration](/getting-started/configuration) — set up your environment
- [Concepts](/concepts) — understand how Shep's agents work
- [CLI Reference](/cli-reference) — all available commands
