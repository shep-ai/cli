# Architecture & Conventions Validation Rules

## Overview

Validates that the feature follows Clean Architecture principles, TypeSpec-first development, and TDD discipline as mandated by the project.

## Clean Architecture Principles

### Layer Dependency Rules

**Must be documented in plan.md:**

1. **Domain Layer Independence:**

   - Domain has NO external dependencies
   - Pure business logic only
   - No framework imports (no Express, no SQLite, no LangGraph)

2. **Application Layer Dependency:**

   - Application depends ONLY on Domain
   - Defines port interfaces (input/output)
   - No knowledge of Infrastructure implementations

3. **Infrastructure Layer Implementation:**

   - Implements Application port interfaces
   - Depends on Application and Domain
   - Contains all external dependencies

4. **Presentation Layer:**
   - Depends on Application (through use cases)
   - No direct Domain access (use cases only)
   - CLI, TUI, Web UI implementations

### Validation Logic

```bash
# Check if plan.md documents Clean Architecture
if ! grep -q "Clean Architecture" "$spec_dir/plan.md"; then
  echo "⚠️  plan.md should reference Clean Architecture principles"
fi

# Check for layer violations in planned files
planned_files=$(awk '/## Files to Create\/Modify/,/^##[^#]/' "$spec_dir/plan.md")

# Domain files should not import from infrastructure
domain_files=$(echo "$planned_files" | grep "src/domain/")
if [[ -n "$domain_files" ]]; then
  echo "✓ Domain files planned"
  # Note: Actual import validation happens during implementation
fi

# Application files should not import from infrastructure
app_files=$(echo "$planned_files" | grep "src/application/")
if [[ -n "$app_files" ]]; then
  echo "✓ Application files planned"
fi
```

### Repository Pattern

**If feature involves data access, must use repository pattern:**

1. **Repository interface** in `src/application/ports/output/`
2. **Repository implementation** in `src/infrastructure/repositories/`
3. **Use cases** depend on repository interface (not implementation)

### Validation Logic

```bash
# Check if feature involves data access
if grep -qi "database\|repository\|persist\|storage" "$spec_dir/spec.md"; then
  # Check if repository pattern is documented
  if ! grep -qi "repository" "$spec_dir/plan.md"; then
    echo "❌ Feature involves data access but doesn't mention repository pattern"
    BLOCKING=true
  fi

  # Check if interface and implementation are separated
  if ! echo "$planned_files" | grep -q "application/ports.*Repository"; then
    echo "❌ Repository interface should be in application/ports/"
    BLOCKING=true
  fi

  if ! echo "$planned_files" | grep -q "infrastructure/repositories"; then
    echo "❌ Repository implementation should be in infrastructure/repositories/"
    BLOCKING=true
  fi
fi
```

## TypeSpec-First Development

### Required for Domain Entities

**All new domain entities MUST be defined in TypeSpec FIRST:**

1. TypeSpec definition in `tsp/domain/entities/*.tsp`
2. TypeScript types generated from TypeSpec
3. No manual interface duplication in TypeScript

### Validation Logic

```bash
# Check if feature creates new domain entities
new_entities=$(echo "$planned_files" | grep "src/domain/entities/" | grep -v "generated")

if [[ -n "$new_entities" ]]; then
  # Check if TypeSpec definitions are planned
  if ! echo "$planned_files" | grep -q "tsp/domain/entities/"; then
    echo "❌ New domain entities planned but no TypeSpec definitions"
    echo "   CRITICAL: Domain entities MUST be defined in TypeSpec first"
    BLOCKING=true
  fi

  # Check if plan mentions TypeSpec compilation
  if ! grep -qi "tsp:compile\|typespec" "$spec_dir/plan.md"; then
    echo "❌ Plan doesn't mention TypeSpec compilation step"
    BLOCKING=true
  fi
fi
```

### Build Flow

**Plan must document correct build flow:**

```
tsp:compile → build → lint → format → test
```

### Validation Logic

```bash
# Check if build flow is documented correctly
if ! grep -q "pnpm tsp:compile" "$spec_dir/plan.md"; then
  if echo "$planned_files" | grep -q "tsp/"; then
    echo "❌ TypeSpec files planned but build flow doesn't include tsp:compile"
    BLOCKING=true
  fi
fi
```

## Test-Driven Development (TDD)

### TDD Phases Required

**EVERY implementation phase in plan.md MUST define TDD cycles:**

1. **RED Phase:** Tests to write FIRST
2. **GREEN Phase:** Minimal implementation to pass
3. **REFACTOR Phase:** Cleanup while keeping tests green

### Validation Logic

```bash
# Check if plan.md has TDD sections
if ! grep -qi "RED.*GREEN.*REFACTOR\|TDD\|Test-Driven" "$spec_dir/plan.md"; then
  echo "❌ plan.md doesn't document TDD approach"
  echo "   CRITICAL: TDD is MANDATORY for all implementation"
  BLOCKING=true
fi

# Check if each phase has TDD cycle
phases=$(grep -c "^### Phase [0-9]" "$spec_dir/plan.md")

for phase_num in $(seq 1 $phases); do
  phase_section=$(awk "/^### Phase $phase_num/,/^### Phase [0-9]+|^##[^#]/" "$spec_dir/plan.md")

  # Skip non-implementation phases (Foundation, Documentation, etc.)
  if echo "$phase_section" | grep -qi "Non-TDD\|Foundation\|Documentation"; then
    continue
  fi

  # Check for RED-GREEN-REFACTOR
  if ! echo "$phase_section" | grep -qi "RED\|Write.*tests.*first"; then
    echo "❌ Phase $phase_num missing RED phase (write tests first)"
    BLOCKING=true
  fi

  if ! echo "$phase_section" | grep -qi "GREEN\|Minimal.*implementation"; then
    echo "❌ Phase $phase_num missing GREEN phase (minimal implementation)"
    BLOCKING=true
  fi

  if ! echo "$phase_section" | grep -qi "REFACTOR\|Improve.*code"; then
    echo "⚠️  Phase $phase_num missing REFACTOR phase (recommended)"
  fi
done
```

### Test Coverage Targets

**Plan must specify test coverage:**

- Unit tests for domain entities and use cases
- Integration tests for repositories
- E2E tests for user-facing features

### Validation Logic

```bash
# Check for Testing Strategy section
if ! grep -q "^## Testing Strategy" "$spec_dir/plan.md"; then
  echo "❌ plan.md missing 'Testing Strategy' section"
  BLOCKING=true
fi

# Check for test types
testing_section=$(awk '/^## Testing Strategy/,/^##[^#]/' "$spec_dir/plan.md")

if ! echo "$testing_section" | grep -qi "unit.*test"; then
  echo "⚠️  Testing strategy doesn't mention unit tests"
fi

if ! echo "$testing_section" | grep -qi "integration.*test"; then
  if echo "$planned_files" | grep -q "infrastructure/repositories"; then
    echo "⚠️  Repository implementations should have integration tests"
  fi
fi

if ! echo "$testing_section" | grep -qi "e2e\|end-to-end"; then
  if echo "$planned_files" | grep -q "presentation/"; then
    echo "⚠️  User-facing features should have E2E tests"
  fi
fi
```

## Use Case Pattern

### Single Responsibility

**Each use case MUST:**

- Have single `execute()` method
- Do one thing well
- Not depend on other use cases (only repositories)

### Validation Logic

```bash
# Check if use cases are planned
use_case_files=$(echo "$planned_files" | grep "application/use-cases/")

if [[ -n "$use_case_files" ]]; then
  echo "✓ Use cases planned"

  # Check if use cases follow naming convention
  if ! echo "$use_case_files" | grep -q "\.use-case\.ts"; then
    echo "⚠️  Use case files should follow naming: *.use-case.ts"
  fi
fi
```

## Dependency Injection

### Container Registration

**If feature adds new use cases or repositories:**

1. Repository implementations must be registered in DI container
2. Use cases must be registered in DI container
3. Constructor injection should be used

### Validation Logic

```bash
# Check if DI container updates are planned
if [[ -n "$use_case_files" ]] || [[ -n "$repository_files" ]]; then
  if ! echo "$planned_files" | grep -q "infrastructure/di/container.ts"; then
    echo "❌ New use cases/repositories but DI container not updated"
    echo "   Add infrastructure/di/container.ts to modified files"
    BLOCKING=true
  fi
fi
```

## Summary

**Architecture validation ensures:**

- Clean Architecture layer dependencies respected
- TypeSpec-first for domain entities
- TDD discipline enforced
- Test coverage targets defined
- Repository pattern used correctly
- Use cases follow single responsibility
- DI container properly updated

**Blocks implementation if:**

- Clean Architecture violations
- Missing TypeSpec definitions for domain entities
- Missing TDD phases in plan
- No testing strategy
- Repository pattern not used for data access

**Auto-fixes:**

- None (architecture issues require design decisions)
