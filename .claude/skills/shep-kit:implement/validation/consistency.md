# Cross-Document Consistency Validation Rules

## Overview

Validates that information is consistent across `spec.md`, `research.md`, `plan.md`, and `tasks.md`. Catches contradictions, mismatched counts, and broken references.

## Task Count Consistency

### Plan Phases vs tasks.md

**Task count in `tasks.md` should match total tasks referenced in `plan.md` phases:**

### Validation Logic

```bash
# Count tasks in tasks.md
task_count_file=$(grep -c "^## Task [0-9]" "$spec_dir/tasks.md")

# Extract total tasks from plan.md
# Look for patterns like "12 tasks", "Total: 12", etc.
task_count_plan=$(grep -oP "(?<=Total|total).*?(\d+).*?(?=task)" "$spec_dir/plan.md" | grep -oP "\d+" | head -1)

if [[ -z "$task_count_plan" ]]; then
  # Try alternate pattern: "5 tasks" or "tasks: 5"
  task_count_plan=$(grep -oP "\d+(?=\s+tasks?)" "$spec_dir/plan.md" | head -1)
fi

if [[ -n "$task_count_plan" ]] && [[ "$task_count_file" -ne "$task_count_plan" ]]; then
  echo "❌ Task count mismatch:"
  echo "   tasks.md: $task_count_file tasks"
  echo "   plan.md references: $task_count_plan tasks"
  BLOCKING=true
fi
```

## Success Criteria Alignment

### Acceptance Criteria vs Success Criteria

**Task acceptance criteria should collectively satisfy spec success criteria:**

This is a **soft check** - requires human judgment, but tool can identify potential mismatches.

### Validation Logic

```bash
# Extract success criteria from spec.md
success_criteria=$(awk '/^## Success Criteria/,/^##[^#]/' "$spec_dir/spec.md" | grep "^-")

# Extract all acceptance criteria from tasks.md
acceptance_criteria=$(grep -A 20 "**Acceptance Criteria:**" "$spec_dir/tasks.md" | grep "^- \[")

# Check if each success criterion has related acceptance criteria
echo "$success_criteria" | while read -r criterion; do
  # Extract key terms from criterion
  key_terms=$(echo "$criterion" | grep -oP "\w+" | tr '\n' '|' | sed 's/|$//')

  if ! echo "$acceptance_criteria" | grep -qiE "$key_terms"; then
    echo "⚠️  Success criterion may not be covered by task acceptance criteria:"
    echo "   $criterion"
  fi
done
```

## Research Decisions Referenced

### Plan References Research

**Technical decisions in `research.md` should be referenced in `plan.md`:**

### Validation Logic

```bash
# Extract technology choices from research.md
tech_choices=$(awk '/^## Technology Choices/,/^##[^#]/' "$spec_dir/research.md" | grep -oP "(?<=\*\*)[^*]+(?=\*\*)")

# Check if plan.md mentions these technologies
plan_content=$(cat "$spec_dir/plan.md")

missing_refs=()
while IFS= read -r tech; do
  if ! echo "$plan_content" | grep -qi "$tech"; then
    missing_refs+=("$tech")
  fi
done <<< "$tech_choices"

if [[ ${#missing_refs[@]} -gt 0 ]]; then
  echo "⚠️  Technologies chosen in research but not mentioned in plan:"
  for tech in "${missing_refs[@]}"; do
    echo "   - $tech"
  done
fi
```

## Cross-Document Contradictions

### Scope Consistency

**Features listed in spec "Affected Areas" should match files in plan "Files to Create/Modify":**

### Validation Logic

```bash
# Extract affected areas from spec.md
affected_areas=$(awk '/^## Affected Areas/,/^##[^#]/' "$spec_dir/spec.md" | grep "^|" | grep -v "Area" | awk -F'|' '{print $2}' | tr -d ' ')

# Extract file paths from plan.md
planned_files=$(awk '/^## Files to Create\/Modify/,/^##[^#]/' "$spec_dir/plan.md" | grep "src/" | awk -F'|' '{print $2}' | tr -d ' ')

# Check if affected areas are represented in file paths
while IFS= read -r area; do
  area_clean=$(echo "$area" | tr -d '`')

  if ! echo "$planned_files" | grep -qi "$area_clean"; then
    echo "⚠️  Affected area '$area' not represented in planned files"
  fi
done <<< "$affected_areas"
```

### Size Estimate vs Complexity

**Size estimate in spec should match plan complexity:**

| Size | File Count | Phase Count |
| ---- | ---------- | ----------- |
| XS   | 1-3        | 1-2         |
| S    | 4-8        | 2-3         |
| M    | 9-15       | 3-5         |
| L    | 16-30      | 5-8         |
| XL   | 30+        | 8+          |

### Validation Logic

```bash
# Extract size estimate
size_estimate=$(grep -oP "(?<=Size Estimate.*: )\w+" "$spec_dir/spec.md" | head -1)

# Count files in plan
file_count=$(echo "$planned_files" | wc -l)

# Count phases in plan
phase_count=$(grep -c "^### Phase [0-9]" "$spec_dir/plan.md")

# Validate consistency
case "$size_estimate" in
  XS)
    if [[ $file_count -gt 3 ]] || [[ $phase_count -gt 2 ]]; then
      echo "⚠️  Size estimate 'XS' but complexity seems higher (files: $file_count, phases: $phase_count)"
    fi
    ;;
  S)
    if [[ $file_count -gt 8 ]] || [[ $phase_count -gt 3 ]]; then
      echo "⚠️  Size estimate 'S' but complexity seems higher (files: $file_count, phases: $phase_count)"
    fi
    ;;
  M)
    if [[ $file_count -gt 15 ]] || [[ $phase_count -gt 5 ]]; then
      echo "⚠️  Size estimate 'M' but complexity seems higher (files: $file_count, phases: $phase_count)"
    fi
    ;;
  L)
    if [[ $file_count -gt 30 ]] || [[ $phase_count -gt 8 ]]; then
      echo "⚠️  Size estimate 'L' but complexity seems higher (files: $file_count, phases: $phase_count)"
    fi
    ;;
esac
```

## Dependency References

### Task Dependencies

**Task dependencies must reference valid task IDs:**

### Validation Logic

```bash
# Extract all task IDs
task_ids=$(grep "^## Task [0-9]" "$spec_dir/tasks.md" | grep -oP "Task \K[0-9]+")

# Check each task's dependencies
for task_num in $task_ids; do
  task_section=$(awk "/^## Task $task_num:/,/^## Task [0-9]+:|^##[^#]/" "$spec_dir/tasks.md")

  # Extract dependencies
  deps=$(echo "$task_section" | grep "**Dependencies:**" | grep -oP "task-\d+")

  for dep in $deps; do
    dep_num=$(echo "$dep" | grep -oP "\d+")

    if ! echo "$task_ids" | grep -q "^$dep_num$"; then
      echo "❌ Task $task_num references non-existent dependency: $dep"
      BLOCKING=true
    fi

    if [[ $dep_num -ge $task_num ]]; then
      echo "❌ Task $task_num depends on later task: $dep (circular dependency?)"
      BLOCKING=true
    fi
  done
done
```

### Feature Dependencies

**Feature dependencies in spec must reference existing specs:**

### Validation Logic

```bash
# Extract feature dependencies from spec.md
feature_deps=$(awk '/^## Dependencies/,/^##[^#]/' "$spec_dir/spec.md" | grep -oP "(?<=\[)[0-9]+-[a-z-]+(?=\])")

if [[ -n "$feature_deps" ]]; then
  for dep in $feature_deps; do
    if [[ ! -d "specs/$dep" ]]; then
      echo "❌ Feature depends on non-existent feature: $dep"
      BLOCKING=true
    fi
  done
fi
```

## Artifact References

### Referenced Files Exist

**Files referenced in docs should exist or be planned:**

### Validation Logic

```bash
# Extract file references from all spec docs
all_refs=$(grep -rh "\[.*\](.*/.*\..*)" "$spec_dir/" | grep -oP "\(.*\)" | tr -d '()')

for ref in $all_refs; do
  # Skip external URLs
  if [[ "$ref" =~ ^https?:// ]]; then
    continue
  fi

  # Check if file exists
  if [[ ! -f "/home/blackpc/workspaces/shep-ai/cli/$ref" ]]; then
    # Check if file is planned to be created
    if ! echo "$planned_files" | grep -q "$ref"; then
      echo "⚠️  Referenced file doesn't exist and isn't planned: $ref"
    fi
  fi
done
```

## Terminology Consistency

### Consistent Naming

**Entity/type names should be consistent across all docs:**

### Validation Logic

```bash
# Extract entity names from spec (capitalized words in context)
spec_entities=$(grep -oP "[A-Z][a-z]+(?:Entity|Model|Service|Repository|UseCase)" "$spec_dir/spec.md" | sort -u)

# Check if naming is consistent across docs
for entity in $spec_entities; do
  spec_count=$(grep -c "$entity" "$spec_dir/spec.md")
  plan_count=$(grep -c "$entity" "$spec_dir/plan.md")
  tasks_count=$(grep -c "$entity" "$spec_dir/tasks.md" 2>/dev/null || echo 0)

  # If mentioned in spec but not in plan, flag it
  if [[ $spec_count -gt 0 ]] && [[ $plan_count -eq 0 ]]; then
    echo "⚠️  Entity '$entity' mentioned in spec but not in plan"
  fi
done
```

## Auto-Fixable Issues

### Can Be Fixed Automatically

1. **Broken internal links** (update file paths)
2. **Inconsistent heading levels** (standardize across docs)
3. **Duplicate checkpoint names** (deduplicate in feature.yaml)

### Not Auto-Fixable

1. **Task count mismatches** (requires human judgment)
2. **Contradictory information** (requires design decision)
3. **Missing success criteria coverage** (requires additional tasks)
4. **Circular dependencies** (requires plan restructure)

## Summary

**Consistency validation ensures:**

- Task count matches between plan and tasks.md
- Success criteria covered by acceptance criteria
- Research decisions referenced in plan
- No contradictions between documents
- Task dependencies are valid
- Feature dependencies exist
- Referenced files exist or are planned
- Terminology is consistent

**Blocks implementation if:**

- Task count mismatch
- Invalid task dependencies
- Circular dependencies
- Non-existent feature dependencies

**Warns if:**

- Success criteria may not be fully covered
- Research decisions not mentioned in plan
- Size estimate doesn't match complexity
- Referenced files missing
- Terminology inconsistencies

**Auto-fixes:**

- Broken internal links (update paths)
- Heading level inconsistencies
