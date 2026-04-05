---
id: sessions
title: Sessions
sidebar_position: 5
---

# Sessions

A **session** is an interactive conversation with a Shep agent. Unlike automated feature runs, sessions let you guide the agent in real time — asking questions, providing context, and iterating on the implementation together.

## Starting a Session

```bash
shep session
```

This opens an interactive terminal session with an AI agent. You can type instructions, ask questions, and watch the agent respond with actions and explanations.

## Use Cases

Sessions are ideal for:

- **Exploring** an unfamiliar codebase with AI guidance
- **Debugging** complex issues interactively
- **Iterating** on code with real-time feedback
- **Pair programming** — working alongside an AI partner
- **Code review** — asking the agent to explain or critique code

## Session vs Feature

| | Session | Feature |
|--|---------|---------|
| **Interaction** | Interactive (you guide) | Autonomous (agent drives) |
| **Use case** | Exploration, debugging, pair programming | Implementing a defined task |
| **Output** | Varies — code changes, explanations, analysis | Feature branch + commits |
| **Duration** | As long as you want | Runs to completion automatically |

## Listing Sessions

```bash
shep session list
```

## Resuming a Session

Previous sessions are stored and can be resumed:

```bash
shep session resume <session-id>
```

## Session History

All session history is available in the Shep UI. Navigate to the Sessions tab to browse past conversations, review agent reasoning, and see what files were changed.

```bash
shep ui
```
