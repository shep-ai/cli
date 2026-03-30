---
id: features
title: Features
sidebar_position: 3
---

# Features

A **feature** is the fundamental unit of work in Shep. It represents a discrete development task — anything from adding a new capability to fixing a bug or refactoring code.

## Creating a Feature

Features are created with the `shep feat` command:

```bash
shep feat "Add rate limiting to the API endpoints"
```

Shep parses your description, creates a spec, and begins the agent pipeline.

## Feature Lifecycle

```
pending → in_progress → review → complete
```

| State | Description |
|-------|-------------|
| `pending` | Feature spec created, agents not yet started |
| `in_progress` | Agents are actively working on the feature |
| `review` | Implementation complete, awaiting human review |
| `complete` | Merged and done |

## Feature Specs

When a feature is created, Shep generates a **spec** — a structured document capturing:

- **Problem statement** — what needs to be built
- **Success criteria** — how to know it's done
- **Affected areas** — which parts of the codebase are involved
- **Dependencies** — other features or external requirements

Specs are stored in the `specs/` directory of your repository, allowing them to be version-controlled and reviewed alongside code.

## Managing Features

List all features:

```bash
shep feat list
```

View a specific feature:

```bash
shep feat show <feature-id>
```

Re-run a feature (if it failed or needs changes):

```bash
shep feat run <feature-id>
```

## Feature Branches

Each feature runs in its own git branch, named after the feature:

```
feat/001-add-rate-limiting
feat/002-fix-auth-bug
```

This keeps your main branch clean and makes it easy to review, test, and merge features independently.
