---
name: tsp-model
description: Use when creating, modifying, or documenting TypeSpec domain models. Triggers include adding new entities, value objects, enums, extending base types, or when asked to create a "tsp model", "domain model", "entity", or work with files in the tsp/ directory.
---

# TypeSpec Domain Model Generation

Generate TypeSpec domain models following this project's conventions for Clean Architecture entities.

## Directory Structure

```
tsp/
├── common/           # Base types, scalars, enums
│   ├── base.tsp      # BaseEntity, SoftDeletableEntity, AuditableEntity
│   ├── scalars.tsp   # UUID scalar type
│   ├── ask.tsp       # Askable interface pattern
│   └── enums/        # One file per enum
├── domain/           # Domain entities
│   ├── entities/     # One file per entity
│   └── value-objects/# Embedded value objects
├── agents/           # Agent system models
└── deployment/       # Deployment configuration models
```

## File Conventions

**One model per file** - Each entity/enum/value-object gets its own file.

**Naming:**

- Files: `kebab-case.tsp` (e.g., `action-item.tsp`)
- Models: `PascalCase` (e.g., `ActionItem`)
- Enums: `PascalCase` with values in `PascalCase` (e.g., `TaskStatus.InProgress`)

## Required Template

Every `.tsp` file MUST follow this structure:

````typespec
/**
 * @module Shep.Domain.Entities.<EntityName>
 *
 * Brief description of the entity's purpose.
 *
 * ## Entity Relationships (if applicable)
 * ASCII diagram showing relationships
 *
 * @see docs/concepts/<relevant-doc>.md
 * @see <related-entity>.tsp
 */
import "../../common/base.tsp";
import "../../common/scalars.tsp";
// other imports...

/**
 * Entity Name
 *
 * Detailed description.
 *
 * ## Properties
 *
 * | Property | Type | Required | Description |
 * |----------|------|----------|-------------|
 * | ...      | ...  | ...      | ...         |
 *
 * @example
 * ```json
 * { ... }
 * ```
 */
@doc("One-line description for OpenAPI")
model EntityName extends BaseEntity {
  /**
   * Property description.
   * @example "example value"
   */
  @doc("One-line property description")
  propertyName: PropertyType;
}
````

## Base Types

**Choose the right base:**

| Base Type             | Use When                                               |
| --------------------- | ------------------------------------------------------ |
| `BaseEntity`          | Standard entity with id, createdAt, updatedAt          |
| `SoftDeletableEntity` | Entity that can be soft-deleted (adds deletedAt)       |
| `AuditableEntity`     | Entity needing audit trail (adds createdBy, updatedBy) |

## Enum Definition Pattern

```typespec
/**
 * @module Shep.Common.Enums.<EnumName>
 */
/**
 * Enum description
 */
@doc("One-line enum description")
enum EnumName {
  @doc("Description of this value")
  ValueOne,

  @doc("Description of this value")
  ValueTwo,
}
```

## Documentation Requirements

1. **Module JSDoc** at file top with `@module`, relationships, `@see` links
2. **Model JSDoc** with property table and JSON examples
3. **Property JSDoc** with `@example` tags
4. **`@doc()` decorator** on every model and property (for OpenAPI)

## Validation Commands

After creating/modifying TypeSpec:

```bash
pnpm tsp:compile    # Verify compilation
pnpm tsp:format     # Format TypeSpec files
```

## Quick Reference

| Task             | Location                              | Example           |
| ---------------- | ------------------------------------- | ----------------- |
| New entity       | `tsp/domain/entities/<name>.tsp`      | feature.tsp       |
| New enum         | `tsp/common/enums/<name>.tsp`         | lifecycle.tsp     |
| New value object | `tsp/domain/value-objects/<name>.tsp` | gantt.tsp         |
| Agent model      | `tsp/agents/<name>.tsp`               | feature-agent.tsp |

## Common Mistakes

- **Missing `@doc()` decorators** - Required for OpenAPI generation
- **Forgetting index.tsp exports** - Add to directory's index.tsp
- **Wrong import paths** - Use relative paths from current file
- **Missing examples** - Always include `@example` with realistic JSON
