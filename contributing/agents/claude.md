# Claude Agent Guidelines

Rules and guidelines for AI agents (Claude, Copilot, etc.) when contributing to this repository.

## Commit Rules

**ALWAYS use Conventional Commits. No exceptions.**

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types (Required)

| Type | Description |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace, no code change |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies, build config |
| `perf` | Performance improvements |
| `ci` | CI/CD configuration changes |

### Scope (Required)

Use the component or area being modified:

- `cli` - CLI commands and presentation
- `tui` - Terminal UI components
- `web` - Web UI (Next.js)
- `agents` - AI agent implementations
- `domain` - Domain entities and services
- `infra` - Infrastructure layer
- `db` - Database/persistence
- `config` - Configuration handling
- `tests` - Test infrastructure

### Examples

```bash
# Features
feat(cli): add interactive wizard for new features
feat(agents): implement repository analysis caching
feat(web): add dark mode toggle

# Fixes
fix(cli): resolve config path on Windows
fix(db): handle concurrent write conflicts
fix(tui): correct keyboard navigation in menus

# Documentation
docs(readme): update installation instructions
docs(agents): add architecture diagrams

# Refactoring
refactor(domain): extract validation logic to value objects
refactor(infra): simplify repository implementations

# Tests
test(domain): add Feature entity edge cases
test(e2e): cover onboarding flow

# Chores
chore(deps): update vitest to v1.0
chore(build): optimize bundle size
```

### Rules

1. **Type is mandatory** - Every commit must start with a valid type
2. **Scope is mandatory** - Always specify the affected component
3. **Description must be imperative** - Use "add" not "added" or "adds"
4. **Description must be lowercase** - No capital letters after the colon
5. **No period at the end** - Description should not end with a period
6. **Keep it concise** - Description should be under 72 characters
7. **Body for details** - Use the body for explaining "why" if needed

### Breaking Changes

For breaking changes, add `!` after the scope and explain in the footer:

```
feat(api)!: change response format for tasks endpoint

BREAKING CHANGE: Task responses now include nested actionItems array
instead of flat structure. Update clients accordingly.
```

## Co-Author Attribution

When committing, include the co-author footer:

```
feat(cli): add status command

Co-Authored-By: Claude <noreply@anthropic.com>
```
