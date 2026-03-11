# Architecture & Conventions Validation Rules

## Overview

Validates that the feature follows Clean Architecture principles, TypeSpec-first development, and TDD discipline as mandated by the project.

**Note:** These rules are implemented programmatically by `pnpm spec:validate <feature-id>`. This document describes the rules for reference.

## Clean Architecture Principles

### Layer Dependency Rules

**Must be documented in plan.yaml:**

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

```yaml
# Check plan.yaml content fields for Clean Architecture references:
# - plan.yaml.architectureOverview or plan.yaml.implementationStrategy
#   must contain "Clean Architecture" (case-insensitive)
# - plan.yaml.filesToCreateOrModify entries are checked for layer violations:
#   - Domain files should not import from infrastructure
#   - Application files should not import from infrastructure
# Note: Actual import validation happens during implementation
```

### Repository Pattern

**If feature involves data access, must use repository pattern:**

1. **Repository interface** in `src/application/ports/output/`
2. **Repository implementation** in `src/infrastructure/repositories/`
3. **Use cases** depend on repository interface (not implementation)

### Validation Logic

```yaml
# Check if spec.yaml mentions data access:
# - Search spec.yaml content for: database, repository, persist, storage
# - If found, check plan.yaml.filesToCreateOrModify for:
#   - application/ports/ entries (repository interfaces)
#   - infrastructure/repositories/ entries (implementations)
# - BLOCKING if data access mentioned but repository pattern not planned
```

## TypeSpec-First Development

### Required for Domain Entities

**All new domain entities MUST be defined in TypeSpec FIRST:**

1. TypeSpec definition in `tsp/domain/entities/*.tsp`
2. TypeScript types generated from TypeSpec
3. No manual interface duplication in TypeScript

### Validation Logic

```yaml
# Check plan.yaml.filesToCreateOrModify:
# - If entries include src/domain/entities/ (excluding generated/):
#   - Must also include tsp/domain/entities/ entries
#   - plan.yaml content must reference "TypeSpec" or "tsp:compile"
#   - BLOCKING if domain entities planned without TypeSpec definitions
```

### Build Flow

**Plan must document correct build flow:**

```
tsp:compile -> build -> lint -> format -> test
```

### Validation Logic

```yaml
# Check plan.yaml content:
# - If filesToCreateOrModify includes tsp/ entries:
#   - plan.yaml content must mention "pnpm tsp:compile" or "tsp:compile"
#   - BLOCKING if TypeSpec files planned but build flow missing
```

## Test-Driven Development (TDD)

### TDD Phases Required

**EVERY implementation phase in plan.yaml MUST define TDD cycles:**

1. **RED Phase:** Tests to write FIRST
2. **GREEN Phase:** Minimal implementation to pass
3. **REFACTOR Phase:** Cleanup while keeping tests green

### Validation Logic

```yaml
# Check plan.yaml content:
# - plan.yaml.implementationStrategy or plan.yaml.phases[]
#   must contain TDD references (case-insensitive):
#   "RED", "GREEN", "REFACTOR", "TDD", "Test-Driven"
# - BLOCKING if no TDD approach documented
#
# Check each phase in plan.yaml.phases[]:
# - Skip non-implementation phases (tagged as foundation/documentation)
# - Each implementation phase should reference RED/GREEN/REFACTOR
# - BLOCKING if implementation phases missing TDD cycles
```

### Test Coverage Targets

**Plan must specify test coverage:**

- Unit tests for domain entities and use cases
- Integration tests for repositories
- E2E tests for user-facing features

### Validation Logic

```yaml
# Check plan.yaml.testingStrategy:
# - Must exist (BLOCKING if missing)
# - Should reference "unit test" (warning if missing)
# - Should reference "integration test" if repositories planned (warning)
# - Should reference "e2e" or "end-to-end" if presentation layer planned (warning)
```

## Use Case Pattern

### Single Responsibility

**Each use case MUST:**

- Have single `execute()` method
- Do one thing well
- Not depend on other use cases (only repositories)

### Validation Logic

```yaml
# Check plan.yaml.filesToCreateOrModify:
# - If entries include application/use-cases/:
#   - Should follow naming convention: *.use-case.ts (warning)
```

## Dependency Injection

### Container Registration

**If feature adds new use cases or repositories:**

1. Repository implementations must be registered in DI container
2. Use cases must be registered in DI container
3. Constructor injection should be used

### Validation Logic

```yaml
# Check plan.yaml.filesToCreateOrModify:
# - If entries include use-cases/ or repositories/:
#   - Must also include infrastructure/di/container.ts
#   - BLOCKING if new use cases/repositories but DI container not updated
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
