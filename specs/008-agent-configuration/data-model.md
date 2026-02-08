# Data Model: agent-configuration

> Entity definitions for 008-agent-configuration

## Status

- **Phase:** Complete
- **Updated:** 2026-02-08

## Overview

Extends the Settings entity with AI coding agent configuration. Adds AgentType and AgentAuthMethod enums, and an AgentConfig value object embedded within Settings.

## Modified Entities

### Settings

**Changes:**

- Add: `agent: AgentConfig` — AI coding agent selection and authentication

## Value Objects

### AgentConfig

**Location:** `tsp/domain/value-objects/agent-config.tsp`

| Property   | Type            | Required | Description                              |
| ---------- | --------------- | -------- | ---------------------------------------- |
| type       | AgentType       | Yes      | Selected AI coding agent                 |
| authMethod | AgentAuthMethod | Yes      | Authentication method for the agent      |
| token      | string          | No       | API token for token-based authentication |

## Enums

### AgentType

**Location:** `tsp/common/enums/agent-config.tsp`

| Value       | Description                |
| ----------- | -------------------------- |
| claude-code | Anthropic Claude Code CLI  |
| gemini-cli  | Google Gemini CLI          |
| aider       | Aider AI coding assistant  |
| continue    | Continue.dev IDE extension |
| cursor      | Cursor AI-powered IDE      |

### AgentAuthMethod

**Location:** `tsp/common/enums/agent-config.tsp`

| Value   | Description                       |
| ------- | --------------------------------- |
| session | Use agent's built-in session auth |
| token   | Authenticate via API token        |

---

_Data model changes for TypeSpec compilation_
