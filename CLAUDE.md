# CLAUDE.md

Guidance for Claude Code. **Shep AI CLI** (`@shepai/cli`) automates the SDLC from idea to deploy.

## Mandatory Workflow

All feature work MUST follow spec-driven development — [full workflow →](docs/development/spec-driven-workflow.md)

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → /shep-kit:implement → /shep-kit:commit-pr
```

- **YAML-first**: Specs in `specs/NNN-feature-name/`. Edit YAML only — Markdown is auto-generated. ([feature.yaml protocol →](docs/development/feature-yaml-protocol.md))
- **TDD (mandatory)**: RED → GREEN → REFACTOR. Write the failing test first. ([TDD guide →](docs/development/tdd-guide.md))
- **TypeSpec-first**: Edit `.tsp` files only — never hand-edit `packages/core/src/domain/generated/output.ts`. ([TypeSpec guide →](docs/development/typespec-guide.md))
- **Storybook required**: Every web UI component MUST have a colocated `.stories.tsx` file.
- **Commits**: `<type>(<scope>): <subject>` — types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- **Agent resolution**: Executor calls MUST flow through `IAgentExecutorProvider.getExecutor()`. Never hardcode agent types. ([AGENTS.md →](AGENTS.md))

## Key Commands

```bash
pnpm test          # Run all tests
pnpm test:watch    # TDD watch mode
pnpm build         # Build CLI + web
pnpm dev:cli       # Run CLI locally
pnpm validate      # Lint + format + typecheck + tsp
pnpm tsp:compile   # Compile TypeSpec → TypeScript types
```

Full reference: [Building & Commands →](docs/development/building.md)

## Architecture

Clean Architecture: domain → application → infrastructure → presentation. ([Overview →](docs/architecture/overview.md))

1. **Dependency Rule**: Dependencies point inward. Domain has zero external deps.
2. **Repository Pattern**: Data access via interfaces in `application/ports/`. ([Details →](docs/architecture/repository-pattern.md))
3. **Use Case Pattern**: One class, one `execute()` method per use case.
4. **DI (tsyringe)**: Use the container — never instantiate directly. ([Clean Arch →](docs/architecture/clean-architecture.md))

## Reference

| Topic                   | Documentation                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Domain models           | [docs/api/domain-models.md](docs/api/domain-models.md)                               |
| Agent system            | [AGENTS.md](AGENTS.md) · [agent-system.md](docs/architecture/agent-system.md)        |
| CLI patterns            | [docs/cli/](docs/cli/)                                                               |
| Web UI                  | [docs/ui/](docs/ui/) · [docs/tui/](docs/tui/)                                        |
| Testing strategy        | [docs/development/testing.md](docs/development/testing.md)                           |
| CI/CD & Docker          | [docs/development/cicd.md](docs/development/cicd.md)                                 |
| Implementation patterns | [docs/development/implementation-guide.md](docs/development/implementation-guide.md) |
