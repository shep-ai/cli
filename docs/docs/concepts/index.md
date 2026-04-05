---
id: index
title: Concepts
sidebar_position: 1
---

# Concepts

Shep is built around a set of core concepts that model the Software Development Lifecycle (SDLC) as a series of AI-driven, observable processes.

Understanding these concepts will help you get the most out of Shep and reason about what agents are doing at each stage.

## Core Concepts

| Concept | Description |
|---------|-------------|
| [SDLC Platform](/concepts/sdlc-platform) | How Shep models the full software lifecycle |
| [Features](/concepts/features) | The unit of work in Shep |
| [Agents](/concepts/agents) | AI workers that implement, review, and deploy |
| [Sessions](/concepts/sessions) | Interactive agent conversations |

## The Shep Model

At its core, Shep treats every development task as a **feature** — a discrete unit of intent that can be researched, implemented, reviewed, and shipped. Features flow through a pipeline of **agents**, each specializing in a phase of the SDLC.

You interact with this pipeline through the **CLI** or the **web UI**, while Shep handles the orchestration automatically.

```
You → shep feat "description"
         ↓
    Feature Created
         ↓
    Research Agent → understands codebase
         ↓
    Implementation Agent → writes code
         ↓
    Review Agent → checks quality
         ↓
    Git commit/PR → ready for you
```
