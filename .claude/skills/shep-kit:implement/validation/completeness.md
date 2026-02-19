# Completeness Validation Rules

## Overview

Basic completeness checks ensure all required YAML source files exist and contain necessary keys before implementation starts.

**Note:** These rules are implemented programmatically by `pnpm spec:validate <feature-id>`. This document describes the rules for reference.

## Required Files

### Must Exist

- [x] `spec.yaml` - Feature specification (YAML source of truth)
- [x] `research.yaml` - Technical decisions (YAML source of truth)
- [x] `plan.yaml` - Implementation strategy (YAML source of truth)
- [x] `tasks.yaml` - Task breakdown (YAML source of truth)
- [x] `feature.yaml` - Status tracking

### Validation Logic

```bash
pnpm spec:validate <feature-id>
# Or manually check:
spec_dir="specs/${FEATURE_ID}"

for file in spec.yaml research.yaml plan.yaml tasks.yaml feature.yaml; do
  if [[ ! -f "$spec_dir/$file" ]]; then
    echo "Missing required file: $file"
    BLOCKING=true
  fi
done
```

## Required Keys in spec.yaml

### Must Contain

- `title` - Feature name
- `status` - Feature metadata (phase, updatedAt)
- `problemStatement` - What problem this solves
- `successCriteria` - Measurable outcomes array
- `affectedAreas` - Impact assessment array
- `dependencies` - Feature dependencies (if any)
- `sizeEstimate` - Complexity (XS/S/M/L/XL)

### Optional But Recommended

- `openQuestions` - Unresolved questions (must all have `resolved: true`)
- `alternativesConsidered` - Design alternatives
- `outOfScope` - Explicitly excluded items

### Validation Logic

```yaml
# Required top-level keys in spec.yaml:
required_keys:
  - title
  - status
  - problemStatement
  - successCriteria
  - affectedAreas
  - dependencies
  - sizeEstimate
```

## Required Keys in research.yaml

### Must Contain

- `title` - Research title
- `status` - Research metadata (phase, updatedAt)
- `technicalApproach` - High-level approach
- `technologyChoices` - Libraries, tools, frameworks
- `decisionLog` - Key decisions with rationale

### Validation Logic

```yaml
# Required top-level keys in research.yaml:
required_keys:
  - title
  - status
  - technicalApproach
  - technologyChoices
  - decisionLog
```

## Required Keys in plan.yaml

### Must Contain

- `title` - Plan title
- `status` - Plan metadata (phase, updatedAt)
- `architectureOverview` - System design
- `implementationStrategy` - Phased approach with TDD cycles
- `filesToCreateOrModify` - Change inventory
- `testingStrategy` - Test approach with TDD emphasis
- `riskMitigation` - Known risks and mitigations
- `phases` - Array of implementation phases with `taskIds`

### Validation Logic

```yaml
# Required top-level keys in plan.yaml:
required_keys:
  - title
  - status
  - architectureOverview
  - implementationStrategy
  - filesToCreateOrModify
  - testingStrategy
  - riskMitigation
  - phases
```

## Required Keys in tasks.yaml

### Must Contain

- `title` - Tasks document title
- `status` - Task metadata (phase, updatedAt)
- `tasks` - Array of task definitions (at least one)

### Task Format

Each entry in the `tasks` array must have:

```yaml
tasks:
  - id: 'task-1'
    title: '<title>'
    description: '<clear description>'
    acceptanceCriteria:
      - '<criterion 1>'
      - '<criterion 2>'
    tddPhases:
      red: '<tests to write first>'
      green: '<minimal implementation>'
      refactor: '<improvements>'
    dependencies: [] # or ['task-N', 'task-M']
    estimatedEffort: '<time estimate>'
```

### Validation Logic

```yaml
# Validate tasks array:
# - tasks[] must have length > 0
# - Each task must have: id, title, description, acceptanceCriteria
# - acceptanceCriteria must be non-empty array
# - tddPhases is recommended (warning if missing)
```

## Open Questions Resolution

### Check for Unresolved Questions

Open questions in `spec.yaml` or `research.yaml` must be resolved before implementation.

**Allowed:**

```yaml
openQuestions:
  - question: 'Should we use Redis or in-memory cache?'
    resolved: true
    decision: 'Redis for production, in-memory for tests'
```

**NOT Allowed (blocks implementation):**

```yaml
openQuestions:
  - question: 'Should we use Redis or in-memory cache?'
    resolved: false
```

### Validation Logic

```yaml
# Check openQuestions array in spec.yaml and research.yaml:
# - If openQuestions exists and any item has resolved: false → BLOCKING
# - Filter: items where resolved != true
```

## Auto-Fixable Issues

### Can Be Fixed Automatically

1. **Missing openQuestions key:**

   - Add `openQuestions: []` to YAML

2. **Missing tasks.yaml but plan.yaml exists:**

   - Create tasks.yaml from template

3. **Regenerate stale Markdown:**
   - Run `pnpm spec:generate-md <feature-id>`

### Auto-Fix Approval

After applying auto-fixes, display summary and require user approval:

```
Auto-fixes applied:

1. Added missing "openQuestions" key to spec.yaml
2. Created tasks.yaml from template
3. Regenerated Markdown files

Review changes? (y/n)
```

## Blocking Issues

### Cannot Be Fixed Automatically

1. **Missing critical content:**

   - Empty problemStatement
   - No successCriteria entries
   - Missing acceptanceCriteria in tasks

2. **Unresolved open questions with content:**

   - Require design decisions
   - Need research or user input

3. **Missing entire required files:**
   - Need to be created with proper content

### Report Format

```
Completeness Validation Failed

Blocking Issues:
1. spec.yaml missing "successCriteria" key
2. tasks.yaml: task-3 has no acceptanceCriteria
3. spec.yaml has 2 unresolved open questions:
   - Should we use Redis or in-memory cache? (resolved: false)
   - Should we support SSO? (resolved: false)

Fix these issues and re-run /shep-kit:implement
```

## Summary

**Completeness validation ensures:**

- All required YAML source files exist
- All required keys present in each YAML file
- Open questions resolved (`resolved: true`)
- Tasks have acceptance criteria
- Documentation is ready for implementation

**Blocks implementation if:**

- YAML files missing
- Required keys missing
- Open questions with `resolved: false`
- Tasks lack acceptanceCriteria

**Auto-fixes:**

- Missing optional keys with defaults
- Missing template files
- Stale Markdown regeneration
