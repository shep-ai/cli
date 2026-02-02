# Data Model: shep-kit

> Entity definitions for 001-shep-kit

## Status

- **Phase:** Planning
- **Updated:** {{DATE}}

## Overview

No new domain entities required. Shep-kit operates on file-based specifications stored in `specs/` directory.

## File-Based "Entities"

### Spec Directory

```
specs/NNN-feature-name/
```

- **NNN**: 3-digit sequential number (001, 002, ...)
- **feature-name**: kebab-case identifier

### Spec Files

| File            | Purpose                               | Created By              |
| --------------- | ------------------------------------- | ----------------------- |
| `spec.md`       | Requirements, scope, dependencies     | `/shep-kit:new-feature` |
| `research.md`   | Technical decisions, analysis         | `/shep-kit:research`    |
| `plan.md`       | Architecture, implementation strategy | `/shep-kit:plan`        |
| `tasks.md`      | Task breakdown with parallelization   | `/shep-kit:plan`        |
| `data-model.md` | Entity changes (if needed)            | `/shep-kit:plan`        |
| `contracts/`    | API specs (if needed)                 | `/shep-kit:plan`        |

## Future Considerations

If specs need to be queryable (search, filter, status tracking), consider:

- Adding to SQLite database
- TypeSpec model: `tsp/domain/entities/feature-spec.tsp`

For now, file-based is sufficient and keeps specs version-controlled with the code.

---

_No domain model changes required for this feature_
