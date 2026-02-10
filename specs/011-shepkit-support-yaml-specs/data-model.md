# Data Model: shepkit-support-yaml-specs

> Entity definitions for 011-shepkit-support-yaml-specs

## Status

- **Phase:** Planning
- **Updated:** 2026-02-10

## Overview

This feature introduces TypeSpec models for spec artifacts (spec, research, plan, tasks) to provide typed, schema-validated YAML parsing. A base model `SpecArtifactBase` captures shared fields, with four concrete entities extending it. Supporting value objects model structured metadata (open questions, tech decisions, plan phases, tasks, TDD cycles).

## New Entities

### SpecArtifactBase

**Location:** `tsp/domain/entities/spec-artifact-base.tsp`

| Property        | Type           | Required | Description                                        |
| --------------- | -------------- | -------- | -------------------------------------------------- |
| name            | string         | Yes      | Artifact title / feature name                      |
| summary         | string         | Yes      | Short description                                  |
| content         | string         | Yes      | Raw Markdown body (the human-written spec content) |
| technologies    | string[]       | Yes      | Key technologies mentioned/evaluated               |
| relatedFeatures | string[]       | Yes      | References to other spec IDs                       |
| relatedLinks    | string[]       | Yes      | URLs to docs, references                           |
| openQuestions   | OpenQuestion[] | Yes      | Structured open questions for gate checks          |

**Relationships:**

- Extends `BaseEntity` (inherits id, createdAt, updatedAt)
- Extended by `FeatureSpec`, `ResearchSpec`, `PlanSpec`, `TasksSpec`

### FeatureSpec

**Location:** `tsp/domain/entities/feature-spec.tsp`

| Property     | Type          | Required | Description             |
| ------------ | ------------- | -------- | ----------------------- |
| number       | int32         | Yes      | Spec number (e.g., 11)  |
| branch       | string        | Yes      | Git branch name         |
| oneLiner     | string        | Yes      | One-line description    |
| phase        | SdlcLifecycle | Yes      | Current lifecycle phase |
| sizeEstimate | string        | Yes      | S/M/L/XL size estimate  |

**Relationships:**

- Extends `SpecArtifactBase`

### ResearchSpec

**Location:** `tsp/domain/entities/research-spec.tsp`

| Property  | Type           | Required | Description                     |
| --------- | -------------- | -------- | ------------------------------- |
| decisions | TechDecision[] | Yes      | Structured technology decisions |

**Relationships:**

- Extends `SpecArtifactBase`

### PlanSpec

**Location:** `tsp/domain/entities/plan-spec.tsp`

| Property      | Type        | Required | Description                      |
| ------------- | ----------- | -------- | -------------------------------- |
| phases        | PlanPhase[] | Yes      | Structured implementation phases |
| filesToCreate | string[]    | Yes      | New files planned                |
| filesToModify | string[]    | Yes      | Existing files to change         |

**Relationships:**

- Extends `SpecArtifactBase`

### TasksSpec

**Location:** `tsp/domain/entities/tasks-spec.tsp`

| Property      | Type       | Required | Description             |
| ------------- | ---------- | -------- | ----------------------- |
| tasks         | SpecTask[] | Yes      | Structured task list    |
| totalEstimate | string     | Yes      | Overall effort estimate |

**Relationships:**

- Extends `SpecArtifactBase`

## Modified Entities

No existing entities are modified.

## Value Objects

### OpenQuestion

**Location:** `tsp/domain/value-objects/spec-metadata.tsp`

| Property | Type    | Description                                  |
| -------- | ------- | -------------------------------------------- |
| question | string  | The question text                            |
| resolved | boolean | Whether the question has been answered       |
| answer   | string? | The answer (optional, present when resolved) |

### TechDecision

**Location:** `tsp/domain/value-objects/spec-metadata.tsp`

| Property  | Type     | Description                                   |
| --------- | -------- | --------------------------------------------- |
| title     | string   | Decision title (e.g., "YAML Parsing Library") |
| chosen    | string   | The chosen option                             |
| rejected  | string[] | Options that were rejected                    |
| rationale | string   | Why this option was chosen                    |

### PlanPhase

**Location:** `tsp/domain/value-objects/spec-metadata.tsp`

| Property | Type     | Description                                     |
| -------- | -------- | ----------------------------------------------- |
| id       | string   | Phase identifier (e.g., "phase-1")              |
| name     | string   | Phase name                                      |
| parallel | boolean  | Whether tasks in this phase can run in parallel |
| taskIds  | string[] | References to SpecTask IDs                      |

### SpecTask

**Location:** `tsp/domain/value-objects/spec-metadata.tsp`

| Property           | Type      | Description                             |
| ------------------ | --------- | --------------------------------------- |
| id                 | string    | Task identifier (e.g., "task-1")        |
| title              | string    | Task title                              |
| description        | string    | Task description                        |
| state              | TaskState | Current state (Todo, WIP, Done, Review) |
| dependencies       | string[]  | IDs of tasks this depends on            |
| acceptanceCriteria | string[]  | Criteria for task completion            |
| tdd                | TddCycle  | TDD cycle details                       |
| estimatedEffort    | string    | Effort estimate (e.g., "S", "M")        |

### TddCycle

**Location:** `tsp/domain/value-objects/spec-metadata.tsp`

| Property | Type     | Description                    |
| -------- | -------- | ------------------------------ |
| red      | string[] | Tests to write first (failing) |
| green    | string[] | Minimal implementation steps   |
| refactor | string[] | Cleanup/improvement steps      |

## Enums

No new enums required. Existing enums are reused:

- `SdlcLifecycle` (from `tsp/common/enums/lifecycle.tsp`) — used by `FeatureSpec.phase`
- `TaskState` (from `tsp/common/enums/states.tsp`) — used by `SpecTask.state`

---

_Data model changes for TypeSpec compilation_
