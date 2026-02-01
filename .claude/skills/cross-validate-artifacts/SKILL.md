---
name: cross-validate-artifacts
description: Cross-validate documentation and artifacts across the codebase for consistency, conflicts, and contradictions. Use when users ask to "cross-validate", "validate docs", "check documentation consistency", "audit documentation", or find conflicts/contradictions in docs. Supports automatic fixing with "validate and fix" argument. Runs parallel subagents for efficient validation across categories (domain-models, agent-system, tech-stack, architecture, cli-commands).
---

# Cross-Validate Artifacts Skill

Cross-validate documentation and artifacts across the codebase for consistency, conflicts, and contradictions.

## Trigger

Use this skill when the user:
- Asks to "cross-validate", "validate docs", "check documentation consistency"
- Wants to find conflicts or contradictions in documentation
- Asks to audit or review documentation for accuracy
- Uses `/cross-validate-artifacts` command

## Arguments

- No arguments: Perform validation and present results summary table, then ask user if they want to fix
- `validate and fix` or `fix`: Perform validation AND automatically fix all issues found
- `--category <name>`: Validate specific category only (domain-models, agent-system, tech-stack, architecture, cli-commands)

## Validation Process

### Step 1: Identify Documentation Sources

Gather all documentation files to validate:

```
Root docs:
- README.md
- CLAUDE.md
- AGENTS.md
- CONTRIBUTING.md

docs/ folder:
- docs/architecture/*.md
- docs/concepts/*.md
- docs/guides/*.md
- docs/development/*.md
- docs/api/*.md
```

### Step 2: Break Into Validation Categories

Split validation into parallel sub-tasks for efficiency. Each category should be handled by a dedicated subagent:

| Category | Description | Key Files to Compare |
|----------|-------------|---------------------|
| **domain-models** | Entity definitions, fields, enums | CLAUDE.md, docs/api/domain-models.md, docs/concepts/*.md |
| **agent-system** | Agent names, tools, state schema, workflow | AGENTS.md, docs/architecture/agent-system.md, docs/guides/langgraph-agents.md |
| **tech-stack** | Framework versions, library references | README.md, CLAUDE.md, docs/architecture/overview.md |
| **architecture** | Layer descriptions, folder structure, patterns | CLAUDE.md, docs/architecture/*.md, CONTRIBUTING.md |
| **cli-commands** | pnpm scripts, paths, configuration | CLAUDE.md, docs/development/*.md, docs/guides/*.md |

### Step 3: Launch Parallel Subagents

CRITICAL: Use the Task tool with `subagent_type=Explore` to run validation categories in parallel.

```
Launch 5 subagents simultaneously:
1. Domain models validation subagent
2. Agent system validation subagent
3. Technology stack validation subagent
4. Architecture validation subagent
5. CLI commands validation subagent
```

Each subagent should:
1. Read all relevant files for its category
2. Compare definitions, names, values across files
3. Identify discrepancies with exact file:line references
4. Return structured list of issues found

### Step 4: Compile Results

Aggregate all subagent results into a summary table:

```markdown
## Validation Results Summary

### Critical Violations (Must Fix)
| # | Category | Issue | Files Affected | Details |
|---|----------|-------|----------------|---------|
| 1 | ... | ... | file.md:line | ... |

### High Priority Violations
| # | Category | Issue | Files Affected | Details |
|---|----------|-------|----------------|---------|

### Medium Priority Violations
...

### Consistent Items (No Issues)
| Category | Status |
|----------|--------|
| ... | Consistent |
```

### Step 5: Present or Fix

**If no "fix" argument provided:**
1. Present the summary table to the user
2. Ask: "Would you like me to fix these violations?"
3. Wait for user confirmation before proceeding

**If "fix" argument provided:**
1. Present the summary table
2. Automatically proceed to fix all violations using parallel subagents

## Fixing Process

### Launch Fix Subagents in Parallel

For each category with violations, launch a dedicated fix subagent:

```
Task tool with subagent_type=general-purpose for each fix task:
- Fix agent system references (CrewAI → LangGraph)
- Fix domain model definitions (add missing fields/entities)
- Fix package manager references (npm → pnpm)
- Fix architecture descriptions
- Fix path references
```

Each fix subagent should:
1. Read the file(s) needing fixes
2. Apply minimal, targeted edits using the Edit tool
3. Preserve existing formatting and structure
4. Report what was changed

### Safety Guidelines for Fixes

1. **Read before edit**: Always read the full file before making changes
2. **Minimal changes**: Only fix the specific discrepancy, don't refactor
3. **Preserve style**: Match existing formatting, indentation, tone
4. **No new content**: Don't add features or documentation beyond fixing inconsistencies
5. **Verify after fix**: Ensure the fix doesn't introduce new conflicts

## Validation Checks by Category

### Domain Models Checks
- Entity fields match across CLAUDE.md, api/domain-models.md, concepts/*.md
- Enum values consistent (SdlcLifecycle, TaskStatus, ArtifactType)
- All entities documented (Feature, Task, ActionItem, Artifact, Requirement)
- Field types match (string, number, arrays, etc.)

### Agent System Checks
- Framework name consistent (LangGraph vs CrewAI)
- Agent/node naming consistent (class names vs function names)
- State schema fields match across docs
- Tool names consistent (snake_case tool names, camelCase variables)
- Workflow stages match

### Tech Stack Checks
- Framework versions specified consistently
- Library names match (Next.js, Vite, Vitest, etc.)
- Package manager consistent (pnpm everywhere)
- Database technology consistent (SQLite, LanceDB)

### Architecture Checks
- Layer names and hierarchy consistent
- Folder structure matches across docs
- Dependency rules documented consistently
- Use case names match (PascalCase vs kebab-case)

### CLI Commands Checks
- pnpm script names consistent
- Command descriptions match
- Data paths consistent (~/.shep/repos/...)
- Config file paths consistent
- Port numbers consistent (3030)

## Example Output

```markdown
## Documentation Cross-Validation Results

### Critical Violations (4 issues)
| # | Category | Issue | Files | Details |
|---|----------|-------|-------|---------|
| 1 | agent-system | CrewAI vs LangGraph | CLAUDE.md:59,106 | Uses "CrewAI-style" but implementation is LangGraph |
| 2 | cli-commands | npm vs pnpm | building.md:20-358 | Uses `npm run` instead of `pnpm` |
| 3 | domain-models | Missing entity | CLAUDE.md | Requirement entity not documented |
| 4 | agent-system | Wrong naming | CLAUDE.md:110-113 | Uses class names instead of node functions |

### Consistent Items
| Category | Status |
|----------|--------|
| Database (SQLite) | Consistent |
| Build tool (Vite) | Consistent |
| Data paths | Consistent |

---
Would you like me to fix these violations?
```

## Notes

- Always use subagents for both validation and fixing to maximize efficiency
- Present results in clean markdown tables for readability
- Prioritize fixes by severity (Critical > High > Medium > Low)
- After fixing, optionally re-run validation to confirm all issues resolved
