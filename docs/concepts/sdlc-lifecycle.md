# SDLC Lifecycle

The Software Development Lifecycle (SDLC) in Shep defines the phases a Feature progresses through from inception to maintenance.

## Lifecycle Enum

```typescript
export enum SdlcLifecycle {
  Started = 'Started',
  Analyze = 'Analyze',
  Requirements = 'Requirements',
  Research = 'Research',
  Planning = 'Planning',
  Implementation = 'Implementation',
  Review = 'Review',
  Maintain = 'Maintain',
  Blocked = 'Blocked',
}
```

## Phase Descriptions

### Started

**Purpose:** Initial state when a feature is first created.

**Entry criteria:**

- Feature created with name and description

**Activities:**

- Feature record initialized
- Repository path and branch recorded

**Exit criteria:**

- Feature metadata complete
- Ready to begin analysis

**Artifacts produced:** None

### Analyze

**Purpose:** Analyze the repository to understand codebase structure and context.

**Entry criteria:**

- Feature in Started phase

**Activities:**

- AI analyzes repository structure
- Identifies relevant code patterns
- Maps existing architecture
- Generates repository context

**Exit criteria:**

- Repository analysis complete
- Codebase context available

**Artifacts produced:** Repository analysis docs

### Requirements

**Purpose:** Gather and validate feature requirements through conversational AI.

**Entry criteria:**

- Analyze phase complete

**Activities:**

- AI proposes options based on repository analysis
- User selects or provides custom requirements
- AI detects and resolves ambiguities
- Requirements validated for completeness

**Exit criteria:**

- All requirements captured
- No open questions remain
- User confirms requirements

**Artifacts produced:** None (requirements stored in Feature)

### Research

**Purpose:** Investigate technical approaches and make architecture decisions.

**Entry criteria:**

- Requirements phase complete

**Activities:**

- Research technical options
- Evaluate trade-offs
- Make architecture decisions
- Document technical rationale

**Exit criteria:**

- Technical decisions documented
- Approach selected

**Artifacts produced:** Research document

### Planning

**Purpose:** Break down requirements into executable work items.

**Entry criteria:**

- Research phase complete
- User triggers planning

**Activities:**

- Decompose feature into Tasks
- Create ActionItems within Tasks
- Establish dependency relationships
- Generate documentation artifacts

**Exit criteria:**

- All Tasks defined
- Dependencies validated (no cycles)
- Required artifacts generated

**Artifacts produced:**

- PRD (Product Requirements Document)
- Design Document
- Technical Plan

### Implementation

**Purpose:** Execute code changes according to plan.

**Entry criteria:**

- Planning phase complete
- User triggers implementation

**Activities:**

- Execute Tasks respecting dependencies
- Generate/modify code following TDD
- Update documentation
- Track progress

**Exit criteria:**

- All Tasks completed
- Code changes committed

**Artifacts produced:** Code, updated docs

### Review

**Purpose:** Review implementation for correctness and quality.

**Entry criteria:**

- Implementation phase complete

**Activities:**

- Code review
- Validate against requirements
- Run automated tests
- Performance and security review if applicable

**Exit criteria:**

- All reviews passed
- Requirements verified

**Artifacts produced:** Review reports

### Maintain

**Purpose:** Ongoing support and iteration.

**Entry criteria:**

- Review phase complete

**Activities:**

- Bug fixes
- Performance optimization
- Minor enhancements
- Documentation updates

**Exit criteria:** N/A (ongoing)

**Artifacts produced:** Various

### Blocked

**Purpose:** Indicates a feature is blocked and cannot progress.

**Entry criteria:**

- Feature encounters a blocking issue from any phase

**Activities:**

- Awaiting external resolution
- User intervention needed

**Exit criteria:**

- Blocking issue resolved

## State Transitions

```
+----> Blocked (can be entered from any phase)
|
+--------------+
|   Started    |
+------+-------+
       | begin analysis
       v
+--------------+
|   Analyze    |
+------+-------+
       | analysis complete
       v
+--------------+
| Requirements |
+------+-------+
       | requirements gathered
       v
+--------------+
|   Research   |
+------+-------+
       | research complete
       v
+--------------+
|   Planning   |
+------+-------+
       | plan complete
       v
+--------------+
|Implementation|
+------+-------+
       | implementation complete
       v
+--------------+
|    Review    |
+------+-------+
       | review passed
       v
+--------------+
|   Maintain   |
+--------------+
```

## Transition Rules

Valid transitions are forward-only with specific exceptions:

| From           | To             | Allowed | Reason                 |
| -------------- | -------------- | ------- | ---------------------- |
| Started        | Analyze        | Yes     | Normal flow            |
| Analyze        | Requirements   | Yes     | Normal flow            |
| Requirements   | Research       | Yes     | Normal flow            |
| Requirements   | Implementation | No      | Must plan first        |
| Research       | Planning       | Yes     | Normal flow            |
| Research       | Requirements   | Yes     | Need more requirements |
| Planning       | Implementation | Yes     | Normal flow            |
| Planning       | Research       | Yes     | Re-research needed     |
| Implementation | Review         | Yes     | Normal flow            |
| Implementation | Planning       | Yes     | Re-planning needed     |
| Review         | Maintain       | Yes     | Normal flow            |
| Review         | Implementation | Yes     | Fixes needed           |
| Maintain       | Requirements   | Yes     | New feature iteration  |
| Any            | Blocked        | Yes     | Blocking issue         |

## UI Representation

In the web UI, lifecycle is shown as a progress indicator:

```
[Started] -> [Analyze] -> [Requirements] -> [Research] -> [Planning] -> [Implementation] -> [Review] -> [Maintain]
    v            v              v              *            o               o               o          o

v = Completed
* = Current
o = Pending
```

---

## Maintaining This Document

**Update when:**

- New lifecycle phases are added
- Transition rules change
- Phase activities evolve

**Related docs:**

- [feature-model.md](./feature-model.md) - Feature entity owns lifecycle
