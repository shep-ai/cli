# Artifacts

Artifacts are documentation files generated during the Plan phase that capture decisions, requirements, and technical approach before implementation begins.

## Artifact Entity

```typescript
export class Artifact {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  name: string;
  type: string;
  category: ArtifactCategory;
  format: ArtifactFormat;
  summary: string;
  path: string;
  state: ArtifactState;
}
```

### Properties

| Property    | Type               | Description                          |
| ----------- | ------------------ | ------------------------------------ |
| `id`        | `string`           | Unique identifier (UUID)             |
| `name`      | `string`           | Artifact name                        |
| `type`      | `string`           | Free-form document type              |
| `category`  | `ArtifactCategory` | Category classification              |
| `format`    | `ArtifactFormat`   | File format                          |
| `summary`   | `string`           | Summary of the artifact content      |
| `path`      | `string`           | Relative path in artifacts directory |
| `state`     | `ArtifactState`    | Current artifact state               |
| `createdAt` | `Date`             | Creation timestamp                   |
| `updatedAt` | `Date`             | Last update timestamp                |

## ArtifactCategory Enum

```typescript
export enum ArtifactCategory {
  PRD = 'PRD',
  API = 'API',
  Design = 'Design',
  Other = 'Other',
}
```

## ArtifactFormat Enum

```typescript
export enum ArtifactFormat {
  Markdown = 'md',
  Text = 'txt',
  Yaml = 'yaml',
  Other = 'Other',
}
```

## ArtifactState Enum

```typescript
export enum ArtifactState {
  Todo = 'Todo',
  Elaborating = 'Elaborating',
  Done = 'Done',
}
```

## Artifact Types

### PRD (Product Requirements Document)

**Purpose:** Define what the feature should do from a user perspective.

**Contents:**

- Problem statement
- User stories
- Acceptance criteria
- Success metrics
- Out of scope items

**Template:**

```markdown
# PRD: [Feature Name]

## Problem Statement

[What problem are we solving?]

## User Stories

- As a [user type], I want to [action] so that [benefit]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Success Metrics

- Metric 1: [target]
- Metric 2: [target]

## Out of Scope

- Item 1
- Item 2
```

### RFC (Request for Comments)

**Purpose:** Propose a technical approach and solicit feedback.

**Contents:**

- Summary
- Motivation
- Detailed design
- Alternatives considered
- Security/performance implications
- Open questions

**Template:**

```markdown
# RFC: [Proposal Title]

## Summary

[One paragraph summary]

## Motivation

[Why is this needed?]

## Detailed Design

[Technical specification]

## Alternatives Considered

### Alternative A

[Description and tradeoffs]

### Alternative B

[Description and tradeoffs]

## Implications

### Security

[Security considerations]

### Performance

[Performance implications]

## Open Questions

- Question 1
- Question 2
```

### Design Document

**Purpose:** Capture UI/UX decisions or system design details.

**Contents:**

- Design goals
- User flows
- Component specifications
- Wireframes/mockups (referenced)
- Interaction patterns

**Template:**

```markdown
# Design: [Feature Name]

## Design Goals

- Goal 1
- Goal 2

## User Flows

### Flow 1: [Name]

1. Step 1
2. Step 2
3. Step 3

## Components

### Component A

[Specification]

## Visual References

- [Link to mockup 1]
- [Link to wireframe 2]
```

### Technical Plan

**Purpose:** Detail the implementation approach at a code level.

**Contents:**

- Architecture overview
- Component breakdown
- API contracts
- Data models
- Dependencies
- Migration plan (if applicable)

**Template:**

```markdown
# Technical Plan: [Feature Name]

## Architecture Overview

[High-level description with diagram]

## Components

### Component A

**Location:** `src/path/to/component`
**Responsibility:** [What it does]

### Component B

**Location:** `src/path/to/component`
**Responsibility:** [What it does]

## API Contracts

### Endpoint 1
```

POST /api/v1/resource
Request: { ... }
Response: { ... }

````

## Data Models
### Model A
```typescript
interface ModelA {
  field1: string;
  field2: number;
}
````

## Dependencies

- New: package-name@version
- Updated: existing-package@new-version

## Migration Plan

1. Step 1
2. Step 2

```

## File Storage

Artifacts are stored in the Shep data directory:

```

~/.shep/repos/<encoded-repo-path>/
└── artifacts/
└── <feature-id>/
├── prd.md
├── rfc.md
├── design.md
└── tech-plan.md

````

## Generation Process

```typescript
// src/infrastructure/agents/planning.agent.ts
class PlanningAgent {
  async generateArtifacts(
    feature: Feature,
    requirements: Requirement[],
    tasks: Task[]
  ): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];

    // PRD from requirements
    const prd = await this.generatePRD(feature, requirements);
    artifacts.push(prd);

    // RFC for technical approach
    const rfc = await this.generateRFC(feature, tasks);
    artifacts.push(rfc);

    // Tech plan from tasks
    const techPlan = await this.generateTechPlan(feature, tasks);
    artifacts.push(techPlan);

    // Design if UI-related requirements exist
    if (this.hasUIRequirements(requirements)) {
      const design = await this.generateDesign(feature, requirements);
      artifacts.push(design);
    }

    // Persist to file system
    await this.persistArtifacts(feature.id, artifacts);

    return artifacts;
  }
}
````

## Artifact Lifecycle

```
Feature Created
      │
      ▼
Requirements Gathered
      │
      ▼
Transition to Planning Phase
      │
      ▼
┌─────────────────────────────────┐
│     Artifacts Generated         │
│                                 │
│  PRD ──► RFC ──► TechPlan      │
│              └──► Design        │
└─────────────────────────────────┘
      │
      ▼
User Reviews/Approves
      │
      ▼
Implementation Begins
      │
      ▼
Artifacts Updated (if needed)
```

## Viewing Artifacts

In the web UI, artifacts appear under the "DOCUMENTATION" tab:

```
┌─────────────────────────────────────────────────────────────┐
│ TICKETS 30 │ DOCUMENTATION 3 │ REQUIREMENTS 6               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📄 Product Requirements Document (PRD)                     │
│  📄 Technical RFC                                           │
│  📄 Implementation Tech Plan                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Custom Artifacts

Users can request additional artifact types:

```typescript
const customArtifact = new Artifact({
  name: 'Security Assessment',
  type: 'security-assessment',
  category: ArtifactCategory.Other,
  format: ArtifactFormat.Markdown,
  summary: 'Security assessment for the feature',
  path: `artifacts/${feature.id}/security-assessment.md`,
  state: ArtifactState.Todo,
});
```

---

## Maintaining This Document

**Update when:**

- New artifact types are added
- Template formats change
- Generation process evolves
- Storage structure changes

**Related docs:**

- [feature-model.md](./feature-model.md) - Parent entity
- [sdlc-lifecycle.md](./sdlc-lifecycle.md) - When artifacts are created
- [../architecture/agent-system.md](../architecture/agent-system.md) - PlanningAgent details
