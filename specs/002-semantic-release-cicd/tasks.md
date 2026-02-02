# Tasks: semantic-release-cicd

> Task breakdown for 002-semantic-release-cicd

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-02

## Task List

### Phase 1: Dependencies & Configuration

- [ ] Install semantic-release core package
- [ ] Install @semantic-release/commit-analyzer
- [ ] Install @semantic-release/release-notes-generator
- [ ] Install @semantic-release/changelog
- [ ] Install @amanda-mitchell/semantic-release-npm-multiple
- [ ] Install @semantic-release/github
- [ ] Install @semantic-release/git
- [ ] Create `release.config.mjs` with plugin configuration
- [ ] Configure multi-registry in release.config.mjs (npm + GitHub)
- [ ] Add `release` scope to commitlint.config.mjs

### Phase 2: GitHub Actions Workflow

- [ ] Create `.github/workflows/release.yml`
- [ ] Configure trigger on main branch push only
- [ ] Set required permissions (contents, issues, pull-requests, id-token)
- [ ] Add checkout step with fetch-depth: 0
- [ ] Add pnpm and Node.js setup steps
- [ ] Add npm audit signatures step
- [ ] Add semantic-release execution step
- [ ] Configure environment variables (GITHUB_TOKEN, NPM_TOKEN)

### Phase 3: Package & Documentation [P]

- [ ] Add `publishConfig` to package.json for GitHub registry
- [ ] Create initial `CHANGELOG.md` (header only)
- [ ] Add "Release Process" section to CONTRIBUTING.md
- [ ] Document NPM_TOKEN secret requirement in CONTRIBUTING.md

### Phase 4: Validation

- [ ] Run `pnpm install` to verify dependencies
- [ ] Run `pnpm lint` to verify config files
- [ ] Verify workflow YAML syntax
- [ ] Create PR for review
- [ ] Test release after merge (first actual release)

## Pre-Implementation Setup (Manual)

Before merging, these must be configured in GitHub:

- [ ] Create `NPM_TOKEN` secret in repository settings
- [ ] Verify @shep-ai org exists on npmjs.com
- [ ] Verify GitHub Package Registry is enabled for repo

## Parallelization Notes

- [P] Phase 3 tasks can run in parallel (independent file updates)
- Phase 1 must complete before Phase 2 (workflow references deps)
- Phase 4 depends on all prior phases

## Acceptance Checklist

Before marking feature complete:

- [ ] All tasks completed
- [ ] Dependencies installed (`pnpm install`)
- [ ] Linting clean (`pnpm lint`)
- [ ] Types valid (`pnpm typecheck`)
- [ ] Workflow YAML valid
- [ ] Documentation updated
- [ ] PR created and reviewed
- [ ] NPM_TOKEN secret configured
- [ ] First release triggered successfully after merge

## First Release Verification

After merging to main, verify:

- [ ] GitHub Actions release job runs
- [ ] Version bumped correctly (based on commits)
- [ ] Package published to npm (`npm info @shep-ai/cli`)
- [ ] Package published to GitHub Package Registry
- [ ] GitHub Release created with changelog
- [ ] CHANGELOG.md updated in repo
- [ ] package.json version committed back

---

_Task breakdown for implementation tracking_
