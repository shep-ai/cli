# CI/CD Pipeline

Automated build, test, and release pipeline using GitHub Actions.

## Pipeline Overview

```
Push/PR to main or develop:
┌──────────┬───────────┬────────────┬───────────┬───────────┬───────────┬────────┐
│   Lint   │ Typecheck │ Unit Tests │  E2E CLI  │  E2E TUI  │  E2E Web  │ Docker │
└──────────┴───────────┴────────────┴───────────┴───────────┴───────────┴────────┘
┌───────────────┬──────────────────────┬──────────┬─────────┬──────────┐
│ Trivy (deps)  │ Trivy (container)    │ Gitleaks │ Semgrep │ Hadolint │
└───────────────┴──────────────────────┴──────────┴─────────┴──────────┘
                            (all run in parallel)

On PR only:
┌──────────────────────────────────────────────────────────────────────┐
│  Claude Review  │  Documentation & Architecture compliance check    │
└──────────────────────────────────────────────────────────────────────┘

On push to main only (after ALL jobs pass, including security):
┌───────────┐
│  Release  │  → npm publish + Docker push + GitHub release
└───────────┘
```

## Jobs

### Parallel Jobs (All Branches)

| Job                   | Description                                     | Duration |
| --------------------- | ----------------------------------------------- | -------- |
| **Lint & Format**     | ESLint + Prettier + TypeSpec compile            | ~30s     |
| **Type Check**        | TypeScript strict mode validation               | ~20s     |
| **Unit Tests**        | Vitest unit + integration tests                 | ~20s     |
| **E2E (CLI)**         | CLI command execution tests                     | ~30s     |
| **E2E (TUI)**         | Terminal UI interaction tests                   | ~20s     |
| **E2E (Web)**         | Playwright browser tests                        | ~25s     |
| **Docker**            | Build and push SHA-tagged image (non-main only) | ~50s     |
| **Trivy (deps)**      | Dependency vulnerability scan (HIGH/CRITICAL)   | ~30s     |
| **Trivy (container)** | Docker image vulnerability scan                 | ~60s     |
| **Gitleaks**          | Secret detection in git history                 | ~15s     |
| **Semgrep**           | SAST for TypeScript/JavaScript patterns         | ~30s     |
| **Hadolint**          | Dockerfile best practices linting               | ~5s      |

### Security Jobs (All Branches)

Security scanners run in parallel and **block releases on main**:

| Scanner               | Tool                                                            | Severity Filter |
| --------------------- | --------------------------------------------------------------- | --------------- |
| **Trivy (deps)**      | Filesystem scan for dependency CVEs                             | HIGH, CRITICAL  |
| **Trivy (container)** | Docker image scan for OS/package vulnerabilities                | HIGH, CRITICAL  |
| **Gitleaks**          | Secret detection (API keys, passwords, tokens)                  | All findings    |
| **Semgrep**           | SAST rules (`p/typescript`, `p/javascript`, `p/security-audit`) | All findings    |
| **Hadolint**          | Dockerfile linting                                              | Warning+        |

Results are uploaded to GitHub Security tab (SARIF format) and displayed in job summaries.

> **Note:** Gitleaks uses the CLI directly (not gitleaks-action) because the GitHub Action requires a paid license for organizations.

### Claude Review Job (PRs Only)

Automated code review using Claude Code, focusing on:

| Check Area                    | What It Validates                                     |
| ----------------------------- | ----------------------------------------------------- |
| **Documentation Consistency** | Changes reflected in docs/, CLAUDE.md, AGENTS.md      |
| **Architecture Compliance**   | Clean Architecture layers, dependency rule, patterns  |
| **TDD & Testing**             | Test coverage for new functionality                   |
| **Spec-Driven Workflow**      | Feature PRs have specs/ directory with required files |

**Review Output:**

- Inline comments on specific code issues
- Summary PR comment with findings and action items

**Required Secret:** `CLAUDE_CODE_OAUTH_TOKEN` (org-level)

### Release Job (Main Only)

Runs after **all parallel jobs pass, including security scanners**. Uses [semantic-release](https://semantic-release.gitbook.io/) to:

1. **Analyze commits** - Determine version bump from conventional commits
2. **Generate changelog** - Create release notes from commits
3. **Update CHANGELOG.md** - Append new release section
4. **Publish to npm** - `@shepai/cli` package
5. **Build & push Docker** - Tags: `latest`, `v<version>`, `sha-<commit>`
6. **Create GitHub release** - With changelog as release notes
7. **Commit changes** - `chore(release): <version> [skip ci]`

## Docker Images

### Registry

Images are published to GitHub Container Registry (ghcr.io):

```
ghcr.io/shep-ai/cli
```

### Tagging Strategy

| Branch       | Trigger          | Tags                               |
| ------------ | ---------------- | ---------------------------------- |
| PR / develop | Docker job       | `sha-<full-commit-sha>`            |
| main         | semantic-release | `latest`, `v1.2.3`, `sha-<commit>` |

### Pull & Run

```bash
# Latest stable
docker pull ghcr.io/shep-ai/cli:latest
docker run ghcr.io/shep-ai/cli --version

# Specific version
docker pull ghcr.io/shep-ai/cli:v1.0.0

# Specific commit (for testing)
docker pull ghcr.io/shep-ai/cli:sha-abc123...
```

### Image Details

- **Base**: `node:22-alpine` (~180MB)
- **Final size**: ~185MB
- **User**: Non-root `shep` (UID 1001)
- **Entrypoint**: `node dist/presentation/cli/index.js`

## Release Process

### Automatic Releases

Releases are fully automated based on [Conventional Commits](https://www.conventionalcommits.org/):

| Commit Type       | Version Bump  | Example                                     |
| ----------------- | ------------- | ------------------------------------------- |
| `feat:`           | Minor (0.X.0) | `feat(cli): add analyze command`            |
| `fix:`            | Patch (0.0.X) | `fix(agents): resolve memory leak`          |
| `perf:`           | Patch         | `perf(db): optimize query performance`      |
| `refactor:`       | Patch         | `refactor(core): simplify state management` |
| `BREAKING CHANGE` | Major (X.0.0) | Footer in commit message                    |

Commits that **don't** trigger releases:

- `docs:`, `style:`, `test:`, `build:`, `ci:`, `chore:`

### Manual Release (Not Recommended)

If needed, you can trigger a release manually:

```bash
# Ensure you're on main with latest changes
git checkout main && git pull

# Run semantic-release in dry-run mode first
npx semantic-release --dry-run

# If satisfied, run actual release (requires NPM_TOKEN)
NPM_TOKEN=xxx GITHUB_TOKEN=xxx npx semantic-release
```

## Configuration Files

| File                                  | Purpose                                              |
| ------------------------------------- | ---------------------------------------------------- |
| `.github/workflows/ci.yml`            | Main CI/CD workflow (build, test, security, release) |
| `.github/workflows/pr-check.yml`      | PR-specific checks (commitlint, PR title)            |
| `.github/workflows/claude-review.yml` | Claude Code automated review                         |
| `release.config.mjs`                  | semantic-release plugins and settings                |
| `Dockerfile`                          | Multi-stage build for production image               |
| `.dockerignore`                       | Files excluded from Docker build context             |
| `commitlint.config.mjs`               | Commit message validation rules                      |

## Limitations & Considerations

### Docker Cache

- **PR builds**: Use GitHub Actions cache (`type=gha`) for layer caching
- **Release builds**: No cache sharing with PR builds (semantic-release uses standard `docker build`)
- **Workaround**: Release builds are optimized via multi-stage Dockerfile caching

### Concurrency

- PRs cancel previous runs on the same branch
- Main branch runs are never cancelled
- Release job has exclusive access via `[skip ci]` in release commits

### Required Secrets

| Secret                    | Purpose                               | Where to Set         |
| ------------------------- | ------------------------------------- | -------------------- |
| `GITHUB_TOKEN`            | Automatic, provided by GitHub Actions | Built-in             |
| `NPM_TOKEN`               | Publishing to npm registry            | Repository secrets   |
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude Code automated PR review       | Organization secrets |

### Branch Protection

Recommended settings for `main`:

- Require status checks: `Lint & Format`, `Type Check`, `Unit Tests`, all E2E jobs, all Security jobs
- Require branches to be up to date
- Require linear history (optional, for cleaner git log)

## Troubleshooting

### Release Not Triggered

1. Check commit messages follow conventional format
2. Ensure push is to `main` branch
3. Verify commit doesn't contain `[skip ci]`
4. Check if commit type triggers a release (see table above)

### Docker Build Fails

1. Check `.dockerignore` isn't excluding required files
2. Verify `pnpm-lock.yaml` is committed
3. Check Node.js version matches `package.json` engines

### npm Publish Fails

1. Verify `NPM_TOKEN` secret is set and valid
2. Check package name isn't taken on npm
3. Ensure version in `package.json` wasn't manually bumped

## Local Testing

### Test Docker Build

```bash
docker build -t shep-cli .
docker run shep-cli --version
```

### Test Release (Dry Run)

```bash
npx semantic-release --dry-run
```

### Validate Commit Messages

```bash
echo "feat(cli): add new command" | npx commitlint
```

---

## Maintaining This Document

**Update when:**

- CI/CD workflow changes
- New jobs are added
- Docker configuration changes
- Release process modifications

**Related files:**

- [.github/workflows/ci.yml](../../.github/workflows/ci.yml)
- [.github/workflows/pr-check.yml](../../.github/workflows/pr-check.yml)
- [.github/workflows/claude-review.yml](../../.github/workflows/claude-review.yml)
- [release.config.mjs](../../release.config.mjs)
- [Dockerfile](../../Dockerfile)
