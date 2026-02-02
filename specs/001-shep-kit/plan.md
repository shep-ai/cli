# Plan: shep-kit

> Implementation plan for 001-shep-kit

## Status

- **Phase:** Complete
- **Updated:** 2026-02-02

## Architecture Overview

```
.claude/skills/
├── shep-kit:new-feature/
│   ├── SKILL.md                    # Main instructions
│   ├── templates/
│   │   ├── spec.md                 # Spec template with {{PLACEHOLDERS}}
│   │   ├── research.md             # Research template
│   │   ├── plan.md                 # Plan template
│   │   ├── tasks.md                # Tasks template
│   │   └── data-model.md           # Data model template
│   ├── examples/
│   │   └── 001-sample-feature/
│   │       └── spec.md             # Complete example
│   └── scripts/
│       └── init-feature.sh         # Scaffolds spec directory
│
├── shep-kit:research/
│   ├── SKILL.md
│   ├── templates/
│   │   └── research.md
│   └── examples/
│       └── sample-research.md
│
└── shep-kit:plan/
    ├── SKILL.md
    ├── templates/
    │   ├── plan.md
    │   └── tasks.md
    └── examples/
        └── sample-plan.md

specs/                              # Root-level spec directory
└── NNN-feature-name/
    ├── spec.md
    ├── research.md
    ├── plan.md
    ├── tasks.md
    ├── data-model.md
    └── contracts/

docs/development/
└── spec-driven-workflow.md         # Single source of truth
```

## Implementation Strategy

### Phase 1: Core Infrastructure

1. Create `specs/` directory with `.gitkeep`
2. Create skill directory structure
3. Write `init-feature.sh` script

### Phase 2: Skills

4. Write `/shep-kit:new-feature` SKILL.md
5. Write `/shep-kit:research` SKILL.md
6. Write `/shep-kit:plan` SKILL.md

### Phase 3: Templates

7. Create all template files with placeholders
8. Create example specs

### Phase 4: Documentation

9. Create `docs/development/spec-driven-workflow.md`
10. Update CONTRIBUTING.md
11. Update CONTRIBUTING-AGENTS.md
12. Update CLAUDE.md
13. Update README.md
14. Update AGENTS.md

## Risk Mitigation

- Bootstrap using our own spec (001-shep-kit) to validate design
- Keep skills minimal, iterate based on usage

---

_Implementation complete. All phases executed successfully._
