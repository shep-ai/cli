---
name: shep-kit:research
description: Use after /shep-kit:new-feature to analyze technical approach, evaluate libraries, document decisions. Triggers include "research", "technical analysis", "evaluate options", "which library", or explicit /shep-kit:research invocation.
---

# Research Technical Approach

Document technical decisions, library evaluations, and architectural choices for a feature.

**Full workflow guide:** [docs/development/spec-driven-workflow.md](../../../docs/development/spec-driven-workflow.md)

## Prerequisites

- Feature spec exists at `specs/NNN-feature-name/spec.md`
- On the feature branch `feat/NNN-feature-name`

## Workflow

### 1. Identify Current Feature

Determine which feature we're researching:

- Check current branch name
- Or ask user which spec to research
- Read `specs/NNN-feature-name/spec.md` for context

### 2. Identify Technical Decisions

From the spec, identify decisions that need research:

- Technology/library choices
- Architecture patterns
- Integration approaches
- Performance strategies

### 3. Research Each Decision

For each technical decision:

**Analyze options:**

- List 2-4 viable approaches
- Research each using web search, documentation
- Consider project constraints (from `CLAUDE.md`, existing patterns)

**Evaluate trade-offs:**

- Pros and cons of each option
- Compatibility with existing stack
- Learning curve, maintenance burden
- Performance implications

**Make recommendation:**

- Choose best option with clear rationale
- Document why alternatives were rejected

### 4. Document Security & Performance

Identify and document:

- Security considerations specific to this feature
- Performance implications and optimizations

### 5. Update research.md

Fill in the research template at `specs/NNN-feature-name/research.md`:

- Technology decisions with rationale
- Library analysis table
- Security considerations
- Performance implications
- Resolved questions

### 6. Commit

```bash
git add specs/NNN-feature-name/research.md
git commit -m "feat(specs): add NNN-feature-name research"
```

### 7. Next Steps

Inform the user:

> Research complete for `NNN-feature-name`!
> Next: `/shep-kit:plan` to create implementation plan.

## Key Principles

- **Evidence-based**: Use web search, docs, benchmarks - not assumptions
- **Project-aware**: Consider existing patterns and constraints
- **Trade-off focused**: Every decision has pros/cons - document both
- **Actionable**: Decisions should enable immediate planning

## Template Location

Template at: `.claude/skills/shep-kit/new-feature/templates/research.md`

## Example

See: `.claude/skills/shep-kit/research/examples/sample-research.md`
