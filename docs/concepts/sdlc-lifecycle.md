# SDLC Lifecycle

The Software Development Lifecycle (SDLC) in Shep defines the phases a Feature progresses through from inception to maintenance.

## Lifecycle Enum

```typescript
export enum SdlcLifecycle {
  Requirements = 'requirements',
  Plan = 'plan',
  Implementation = 'implementation',
  Test = 'test',
  Deploy = 'deploy',
  Maintenance = 'maintenance',
}
```

## Phase Descriptions

### Requirements

**Purpose:** Gather and validate feature requirements through conversational AI.

**Entry criteria:**

- Feature created with name and description

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

### Plan

**Purpose:** Break down requirements into executable work items.

**Entry criteria:**

- Requirements phase complete
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
- RFC (Request for Comments)
- Design Document
- Technical Plan

### Implementation

**Purpose:** Execute code changes according to plan.

**Entry criteria:**

- Plan phase complete
- User triggers implementation

**Activities:**

- Execute Tasks respecting dependencies
- Generate/modify code
- Update documentation
- Track progress

**Exit criteria:**

- All Tasks completed
- Code changes committed

**Artifacts produced:** Code, updated docs

### Test

**Purpose:** Validate implementation meets requirements.

**Entry criteria:**

- Implementation phase complete

**Activities:**

- Run automated tests
- Validate against requirements
- Performance testing if applicable
- Security review if applicable

**Exit criteria:**

- All tests pass
- Requirements verified

**Artifacts produced:** Test reports

### Deploy

**Purpose:** Release changes to target environment.

**Entry criteria:**

- Test phase complete

**Activities:**

- Deploy to staging/production
- Monitor for issues
- Rollback if necessary

**Exit criteria:**

- Successfully deployed
- No critical issues

**Artifacts produced:** Deployment logs, release notes

### Maintenance

**Purpose:** Ongoing support and iteration.

**Entry criteria:**

- Deploy phase complete

**Activities:**

- Bug fixes
- Performance optimization
- Minor enhancements
- Documentation updates

**Exit criteria:** N/A (ongoing)

**Artifacts produced:** Various

## State Transitions

```
┌──────────────┐
│ Requirements │
└──────┬───────┘
       │ complete requirements
       ▼
┌──────────────┐
│     Plan     │
└──────┬───────┘
       │ complete planning
       ▼
┌──────────────┐
│Implementation│
└──────┬───────┘
       │ complete implementation
       ▼
┌──────────────┐
│     Test     │
└──────┬───────┘
       │ all tests pass
       ▼
┌──────────────┐
│    Deploy    │
└──────┬───────┘
       │ successful deployment
       ▼
┌──────────────┐
│ Maintenance  │
└──────────────┘
```

## Transition Rules

Valid transitions are forward-only with specific exceptions:

| From           | To             | Allowed | Reason                 |
| -------------- | -------------- | ------- | ---------------------- |
| Requirements   | Plan           | Yes     | Normal flow            |
| Requirements   | Implementation | No      | Must plan first        |
| Plan           | Implementation | Yes     | Normal flow            |
| Plan           | Requirements   | Yes     | Need more requirements |
| Implementation | Test           | Yes     | Normal flow            |
| Implementation | Plan           | Yes     | Re-planning needed     |
| Test           | Deploy         | Yes     | Normal flow            |
| Test           | Implementation | Yes     | Fixes needed           |
| Deploy         | Maintenance    | Yes     | Normal flow            |
| Deploy         | Implementation | Yes     | Hotfixes               |
| Maintenance    | Requirements   | Yes     | New feature iteration  |

## Implementation

Domain service enforces transition rules:

```typescript
// src/domain/services/lifecycle-rules.ts
export class LifecycleRules {
  private static transitions: Map<SdlcLifecycle, SdlcLifecycle[]> = new Map([
    [SdlcLifecycle.Requirements, [SdlcLifecycle.Plan]],
    [SdlcLifecycle.Plan, [SdlcLifecycle.Implementation, SdlcLifecycle.Requirements]],
    [SdlcLifecycle.Implementation, [SdlcLifecycle.Test, SdlcLifecycle.Plan]],
    [SdlcLifecycle.Test, [SdlcLifecycle.Deploy, SdlcLifecycle.Implementation]],
    [SdlcLifecycle.Deploy, [SdlcLifecycle.Maintenance, SdlcLifecycle.Implementation]],
    [SdlcLifecycle.Maintenance, [SdlcLifecycle.Requirements]],
  ]);

  static canTransition(from: SdlcLifecycle, to: SdlcLifecycle): boolean {
    const allowed = this.transitions.get(from) ?? [];
    return allowed.includes(to);
  }

  static getValidTransitions(from: SdlcLifecycle): SdlcLifecycle[] {
    return this.transitions.get(from) ?? [];
  }
}
```

## UI Representation

In the web UI, lifecycle is shown as a progress indicator:

```
[Requirements] → [Plan] → [Implementation] → [Test] → [Deploy] → [Maintenance]
      ✓            ●           ○              ○          ○            ○

✓ = Completed
● = Current
○ = Pending
```

---

## Maintaining This Document

**Update when:**

- New lifecycle phases are added
- Transition rules change
- Phase activities evolve

**Related docs:**

- [feature-model.md](./feature-model.md) - Feature entity owns lifecycle
- [../guides/web-ui.md](../guides/web-ui.md) - UI lifecycle visualization
