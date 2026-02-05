# Completeness Validation Rules

## Overview

Basic completeness checks ensure all required documentation exists and contains necessary information before implementation starts.

## Required Files

### Must Exist

- [x] `spec.md` - Feature specification
- [x] `research.md` - Technical decisions
- [x] `plan.md` - Implementation strategy
- [x] `tasks.md` - Task breakdown
- [x] `feature.yaml` - Status tracking

### Validation Logic

```bash
spec_dir="specs/${FEATURE_ID}"

for file in spec.md research.md plan.md tasks.md feature.yaml; do
  if [[ ! -f "$spec_dir/$file" ]]; then
    echo "❌ Missing required file: $file"
    BLOCKING=true
  fi
done
```

## Required Sections in spec.md

### Must Contain

- `# Feature: <name>` - Title
- `## Status` - Feature metadata
- `## Problem Statement` - What problem this solves
- `## Success Criteria` - Measurable outcomes with checkboxes
- `## Affected Areas` - Impact assessment
- `## Dependencies` - Feature dependencies (if any)
- `## Size Estimate` - Complexity (XS/S/M/L/XL)

### Optional But Recommended

- `## Open Questions` - Unresolved questions (must be empty or all resolved)
- `## Alternatives Considered` - Design alternatives
- `## Out of Scope` - Explicitly excluded items

### Validation Logic

```bash
required_sections=(
  "# Feature:"
  "## Status"
  "## Problem Statement"
  "## Success Criteria"
  "## Affected Areas"
  "## Dependencies"
  "## Size Estimate"
)

for section in "${required_sections[@]}"; do
  if ! grep -q "^$section" "$spec_dir/spec.md"; then
    echo "❌ Missing required section in spec.md: $section"
    BLOCKING=true
  fi
done
```

## Required Sections in research.md

### Must Contain

- `# Research: <name>` - Title
- `## Status` - Research metadata
- `## Technical Approach` - High-level approach
- `## Technology Choices` - Libraries, tools, frameworks
- `## Decision Log` - Key decisions with rationale

### Validation Logic

```bash
required_sections=(
  "# Research:"
  "## Status"
  "## Technical Approach"
  "## Technology Choices"
  "## Decision Log"
)

for section in "${required_sections[@]}"; do
  if ! grep -q "^$section" "$spec_dir/research.md"; then
    echo "❌ Missing required section in research.md: $section"
    BLOCKING=true
  fi
done
```

## Required Sections in plan.md

### Must Contain

- `# Plan: <name>` - Title
- `## Status` - Plan metadata
- `## Architecture Overview` - System design
- `## Implementation Strategy` - Phased approach with TDD cycles
- `## Files to Create/Modify` - Change inventory
- `## Testing Strategy` - Test approach with TDD emphasis
- `## Risk Mitigation` - Known risks and mitigations

### Validation Logic

```bash
required_sections=(
  "# Plan:"
  "## Status"
  "## Architecture Overview"
  "## Implementation Strategy"
  "## Files to Create/Modify"
  "## Testing Strategy"
  "## Risk Mitigation"
)

for section in "${required_sections[@]}"; do
  if ! grep -q "^$section" "$spec_dir/plan.md"; then
    echo "❌ Missing required section in plan.md: $section"
    BLOCKING=true
  fi
done
```

## Required Sections in tasks.md

### Must Contain

- `# Tasks: <name>` - Title
- `## Status` - Task metadata
- At least one task definition

### Task Format

Each task must have:

```markdown
## Task N: <title>

**Description:** Clear description

**Acceptance Criteria:**

- [ ] Criterion 1
- [ ] Criterion 2

**TDD Phases:**

- RED: <tests to write first>
- GREEN: <minimal implementation>
- REFACTOR: <improvements>

**Dependencies:** task-N, task-M (or "None")

**Estimated Effort:** <time estimate>
```

### Validation Logic

```bash
# Count tasks
task_count=$(grep -c "^## Task [0-9]" "$spec_dir/tasks.md")

if [[ $task_count -eq 0 ]]; then
  echo "❌ No tasks defined in tasks.md"
  BLOCKING=true
fi

# Validate each task has acceptance criteria
for task_num in $(seq 1 $task_count); do
  task_section=$(awk "/^## Task $task_num:/{flag=1;next}/^## Task [0-9]+:/{flag=0}flag" "$spec_dir/tasks.md")

  if ! echo "$task_section" | grep -q "**Acceptance Criteria:**"; then
    echo "❌ Task $task_num missing acceptance criteria"
    BLOCKING=true
  fi

  if ! echo "$task_section" | grep -q "**TDD Phases:**"; then
    echo "⚠️  Task $task_num missing TDD phases (recommended)"
  fi
done
```

## Open Questions Resolution

### Check for Unresolved Questions

Open questions in `spec.md` or `plan.md` must be resolved before implementation.

**Allowed:**

```markdown
## Open Questions

- [x] Should we use Redis or in-memory cache?
  - Decision: Redis for production, in-memory for tests
```

**NOT Allowed (blocks implementation):**

```markdown
## Open Questions

- [ ] Should we use Redis or in-memory cache?
```

### Validation Logic

```bash
# Check spec.md for open questions
if grep -q "^## Open Questions" "$spec_dir/spec.md"; then
  open_questions=$(awk '/^## Open Questions/,/^##[^#]/' "$spec_dir/spec.md" | grep "^- \[ \]")

  if [[ -n "$open_questions" ]]; then
    echo "❌ Unresolved open questions in spec.md:"
    echo "$open_questions"
    BLOCKING=true
  fi
fi

# Check plan.md for open questions
if grep -q "^## Open Questions" "$spec_dir/plan.md"; then
  open_questions=$(awk '/^## Open Questions/,/^##[^#]/' "$spec_dir/plan.md" | grep "^- \[ \]")

  if [[ -n "$open_questions" ]]; then
    echo "❌ Unresolved open questions in plan.md:"
    echo "$open_questions"
    BLOCKING=true
  fi
fi
```

## Auto-Fixable Issues

### Can Be Fixed Automatically

1. **Missing Open Questions section:**

   - Add `## Open Questions\n\nNone identified.`

2. **Empty checkbox without content:**

   ```markdown
   - [ ]
   ```

   - Convert to: `- [x] Resolved: <timestamp>`

3. **Missing tasks.md but plan.md exists:**

   - Create tasks.md from template

4. **Heading level inconsistencies:**
   - Fix heading levels to match document structure

### Auto-Fix Approval

After applying auto-fixes, display summary and require user approval:

```
🔧 Auto-fixes applied:

1. Added missing "Open Questions" section to spec.md
2. Closed 3 empty checkbox lines in plan.md
3. Fixed heading levels in research.md

Review changes? (y/n)
```

## Blocking Issues

### Cannot Be Fixed Automatically

1. **Missing critical content:**

   - Empty Problem Statement
   - No Success Criteria
   - Missing Acceptance Criteria in tasks

2. **Unresolved open questions with content:**

   - Require design decisions
   - Need research or user input

3. **Missing entire required files:**
   - Need to be created with proper content

### Report Format

```
❌ Completeness Validation Failed

Blocking Issues:
1. spec.md missing "Success Criteria" section
2. tasks.md: Task 3 has no acceptance criteria
3. spec.md has 2 unresolved open questions:
   - [ ] Which authentication method to use?
   - [ ] Should we support SSO?

Fix these issues and re-run /shep-kit:implement
```

## Summary

**Completeness validation ensures:**

- All required files exist
- All required sections present
- Open questions resolved
- Tasks have acceptance criteria
- Documentation is ready for implementation

**Blocks implementation if:**

- Files missing
- Sections missing
- Open questions with content
- Tasks lack acceptance criteria

**Auto-fixes:**

- Missing empty sections
- Empty checkboxes
- Formatting issues
