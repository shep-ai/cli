# Cross-Document Consistency Validation Rules

## Overview

Validates that information is consistent across `spec.yaml`, `research.yaml`, `plan.yaml`, and `tasks.yaml`. Catches contradictions, mismatched counts, and broken references.

**Note:** These rules are implemented programmatically by `pnpm spec:validate <feature-id>`. This document describes the rules for reference.

## Task Count Consistency

### plan.yaml phases vs tasks.yaml

**Task count in `tasks.yaml` tasks[] should match total taskIds referenced across `plan.yaml` phases[]:**

### Validation Logic

```yaml
# Compare task counts between YAML files:
#
# 1. Count tasks in tasks.yaml:
#    task_count_file = tasks.yaml.tasks.length
#
# 2. Collect all taskIds from plan.yaml phases:
#    plan_task_ids = plan.yaml.phases[].taskIds (flatten all arrays)
#    task_count_plan = plan_task_ids.length (unique)
#
# 3. Compare:
#    - If task_count_file != task_count_plan → BLOCKING
#    - Report: "tasks.yaml has N tasks, plan.yaml references M task IDs"
#
# 4. Cross-reference:
#    - Every tasks.yaml tasks[].id should appear in some plan.yaml phases[].taskIds
#    - Every plan.yaml phases[].taskIds entry should exist in tasks.yaml tasks[].id
#    - Warning for orphaned tasks or missing references
```

## Success Criteria Alignment

### Acceptance Criteria vs Success Criteria

**Task acceptance criteria should collectively satisfy spec success criteria:**

This is a **soft check** - requires human judgment, but tool can identify potential mismatches.

### Validation Logic

```yaml
# Compare spec.yaml.successCriteria[] with tasks.yaml tasks[].acceptanceCriteria[]:
# - Extract key terms from each success criterion
# - Check if acceptance criteria across all tasks cover those terms
# - Warning if a success criterion appears uncovered
```

## Research Decisions Referenced

### Plan References Research

**Technical decisions in `research.yaml` should be referenced in `plan.yaml`:**

### Validation Logic

```yaml
# Cross-reference research.yaml.technologyChoices with plan.yaml content:
# - Extract technology names from research.yaml.technologyChoices[]
# - Check if plan.yaml content (any field) mentions each technology
# - Warning for technologies chosen in research but not mentioned in plan
```

## Cross-Document Contradictions

### Scope Consistency

**Features listed in spec.yaml affectedAreas should match files in plan.yaml filesToCreateOrModify:**

### Validation Logic

```yaml
# Compare spec.yaml.affectedAreas[] with plan.yaml.filesToCreateOrModify[]:
# - Each affected area should correspond to at least one planned file
# - Warning if an affected area has no planned file changes
```

### Size Estimate vs Complexity

**Size estimate in spec.yaml should match plan complexity:**

| Size | File Count | Phase Count |
| ---- | ---------- | ----------- |
| XS   | 1-3        | 1-2         |
| S    | 4-8        | 2-3         |
| M    | 9-15       | 3-5         |
| L    | 16-30      | 5-8         |
| XL   | 30+        | 8+          |

### Validation Logic

```yaml
# Compare spec.yaml.sizeEstimate with plan.yaml complexity:
# - file_count = plan.yaml.filesToCreateOrModify.length
# - phase_count = plan.yaml.phases.length
# - Check against size/complexity table above
# - Warning if size estimate doesn't match actual complexity
```

## Dependency References

### Task Dependencies

**Task dependencies in tasks.yaml must reference valid task IDs:**

### Validation Logic

```yaml
# Validate tasks.yaml tasks[].dependencies:
#
# 1. Collect all valid task IDs:
#    valid_ids = tasks.yaml.tasks[].id
#
# 2. For each task, check dependencies:
#    for task in tasks.yaml.tasks:
#      for dep in task.dependencies:
#        - dep must exist in valid_ids → BLOCKING if not
#
# 3. Circular dependency detection:
#    - Build directed graph from tasks[].dependencies
#    - Run topological sort or cycle detection
#    - BLOCKING if circular dependency found
#    - Report the cycle: "Circular dependency: task-1 -> task-3 -> task-1"
```

### Feature Dependencies

**Feature dependencies in spec.yaml must reference existing specs:**

### Validation Logic

```yaml
# Check spec.yaml.dependencies[] for feature references:
# - Each referenced feature spec directory must exist in specs/
# - BLOCKING if dependency references non-existent feature
```

## Artifact References

### Referenced Files Exist

**Files referenced in YAML docs should exist or be planned:**

### Validation Logic

```yaml
# Extract file references from all YAML spec files:
# - Check any path-like values in YAML content
# - Skip external URLs (http://, https://)
# - Verify file exists on disk or is listed in plan.yaml.filesToCreateOrModify
# - Warning if referenced file doesn't exist and isn't planned
```

## Terminology Consistency

### Consistent Naming

**Entity/type names should be consistent across all YAML docs:**

### Validation Logic

```yaml
# Extract entity names from spec.yaml content:
# - Look for PascalCase names matching *Entity, *Model, *Service, *Repository, *UseCase
# - Check if same names appear in plan.yaml and tasks.yaml
# - Warning if entity mentioned in spec but not in plan
```

## Auto-Fixable Issues

### Can Be Fixed Automatically

1. **Regenerate stale Markdown** - `pnpm spec:generate-md <feature-id>`
2. **Duplicate checkpoint names** - deduplicate in feature.yaml

### Not Auto-Fixable

1. **Task count mismatches** (requires human judgment)
2. **Contradictory information** (requires design decision)
3. **Missing success criteria coverage** (requires additional tasks)
4. **Circular dependencies** (requires plan restructure)

## Summary

**Consistency validation ensures:**

- Task count matches between plan.yaml phases and tasks.yaml
- Success criteria covered by acceptance criteria
- Research decisions referenced in plan
- No contradictions between YAML documents
- Task dependencies are valid (no invalid refs, no cycles)
- Feature dependencies exist
- Referenced files exist or are planned
- Terminology is consistent

**Blocks implementation if:**

- Task count mismatch between plan.yaml and tasks.yaml
- Invalid task dependency references
- Circular dependencies in task graph
- Non-existent feature dependencies

**Warns if:**

- Success criteria may not be fully covered
- Research decisions not mentioned in plan
- Size estimate doesn't match complexity
- Referenced files missing
- Terminology inconsistencies

**Auto-fixes:**

- Stale Markdown regeneration
- Duplicate checkpoint deduplication
