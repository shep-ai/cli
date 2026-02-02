# Contributing to Shep AI CLI

Thank you for your interest in contributing to Shep AI CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold respectful and inclusive behavior.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+ (`npm install -g pnpm`)
- Git

### Development Setup

```bash
# Clone the repository
git clone https://github.com/shep-ai/cli.git
cd cli

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests to verify setup (TDD infrastructure)
pnpm test
```

### Running Locally

```bash
# Development mode with hot reload
pnpm dev

# Test CLI commands directly
pnpm cli -- --help

# Link globally for testing
pnpm link --global
shep --help
```

## How to Contribute

### Starting a Feature (MANDATORY)

**All feature work MUST begin with `/shep-kit:new-feature`.** This ensures consistent specifications across all contributions.

See [Spec-Driven Workflow](./docs/development/spec-driven-workflow.md) for complete details.

```
/shep-kit:new-feature → /shep-kit:research → /shep-kit:plan → implement
```

The workflow creates:

- A feature branch `feat/NNN-feature-name`
- A spec directory `specs/NNN-feature-name/` with:
  - `spec.md` - Requirements and scope
  - `research.md` - Technical decisions
  - `plan.md` - Implementation strategy
  - `tasks.md` - Task breakdown

### Reporting Issues

Before creating an issue:

1. Search existing issues to avoid duplicates
2. Use the issue templates when available
3. Include reproduction steps for bugs
4. Provide system information (OS, Node version, npm version)

### Submitting Changes

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Write tests FIRST** (TDD - Red-Green-Refactor)
5. **Run the test suite**:
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```
6. **Commit** with clear messages (see commit guidelines below)
7. **Push** to your fork
8. **Open a Pull Request** against `main`

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Important:** The description must be ALL lowercase, including acronyms (`pr` not `PR`, `api` not `API`).

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(agents): add repository analysis caching
fix(cli): resolve config path resolution on Windows
docs(readme): update installation instructions
```

## Coding Standards

### TypeScript

- Strict mode enabled
- Explicit return types on public methods
- Interfaces over type aliases for object shapes
- Use `readonly` where applicable

### Architecture

Follow Clean Architecture principles:

- Domain layer has no external dependencies
- Use interfaces for external concerns
- One use case per file
- Repository pattern for all data access

### Testing (TDD Required)

We follow Test-Driven Development:

1. **Write failing test first** (RED)
2. **Write minimal code to pass** (GREEN)
3. **Refactor while keeping tests green** (REFACTOR)

Test layers:

- **Unit tests**: Domain logic (Vitest)
- **Integration tests**: Repositories with SQLite (Vitest)
- **E2E tests**: CLI and Web UI (Playwright)

See [docs/development/tdd-guide.md](./docs/development/tdd-guide.md) for detailed TDD workflow.

### File Organization

```
src/
├── domain/           # Pure business logic
├── application/      # Use cases and ports
├── infrastructure/   # External implementations
└── presentation/     # CLI, TUI, Web
```

## Pull Request Process

1. **Title**: Use conventional commit format
2. **Description**: Explain what and why
3. **Link issues**: Reference related issues
4. **Screenshots**: Include for UI changes
5. **Tests**: Ensure all tests pass
6. **Documentation**: Update relevant docs

### Review Criteria

PRs are reviewed for:

- Correctness and completeness
- Architecture alignment
- Test coverage
- Code quality and readability
- Documentation updates

## Development Workflow

### Branch Naming

- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation
- `refactor/*` - Code restructuring

### Local Testing (TDD Workflow)

```bash
# Start TDD watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint

# All tests
pnpm test

# Single test file
pnpm test:single tests/unit/domain/entities/feature.test.ts

# E2E tests (Playwright)
pnpm test:e2e

# Build verification
pnpm build
```

## Documentation

When contributing:

- Update relevant docs in `docs/`
- Keep CLAUDE.md current for AI tooling
- Add JSDoc comments for public APIs
- Update README.md for user-facing changes

## Release Process

Releases are fully automated using [semantic-release](https://semantic-release.gitbook.io/).

### How It Works

1. **Commit to main** - When PRs are merged to `main`, semantic-release analyzes commits
2. **Version bump** - Based on commit types (`feat` → minor, `fix` → patch, `BREAKING CHANGE` → major)
3. **Publish** - Package is published to:
   - npm registry (`npm install @shep-ai/cli`)
   - GitHub Package Registry (`npm install @shep-ai/cli --registry=https://npm.pkg.github.com`)
4. **Release** - GitHub Release is created with auto-generated changelog
5. **Changelog** - `CHANGELOG.md` is updated and committed

### What Triggers a Release

| Commit Type       | Version Bump  | Example                            |
| ----------------- | ------------- | ---------------------------------- |
| `feat`            | Minor (0.x.0) | `feat(cli): add new command`       |
| `fix`             | Patch (0.0.x) | `fix(agents): resolve memory leak` |
| `perf`            | Patch         | `perf(cli): improve startup time`  |
| `BREAKING CHANGE` | Major (x.0.0) | Footer with `BREAKING CHANGE:`     |

Commits with types `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` do **not** trigger releases.

### For Maintainers

- Ensure `NPM_TOKEN` secret is configured in repository settings
- The `@shep-ai` npm organization must exist and have publish permissions
- GitHub Package Registry is enabled automatically for the repository

## Questions?

- Open a [Discussion](https://github.com/shep-ai/cli/discussions) for questions
- Join our community channels (links TBD)

---

## Maintaining This Document

**Update when:**

- Contribution process changes
- New tooling is adopted
- Repository structure changes
- Community channels are established

**Related docs:**

- [docs/development/setup.md](./docs/development/setup.md) - Detailed dev environment setup
- [docs/development/testing.md](./docs/development/testing.md) - Testing guidelines
