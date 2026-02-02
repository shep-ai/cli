# Tasks: semantic-release-cicd

> Task breakdown for 002-semantic-release-cicd

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-02

## Task List

### Phase 1: Dependencies & Configuration

- [x] Install semantic-release core package
- [x] Install @semantic-release/commit-analyzer
- [x] Install @semantic-release/release-notes-generator
- [x] Install @semantic-release/changelog
- [x] Install @amanda-mitchell/semantic-release-npm-multiple
- [x] Install @semantic-release/github
- [x] Install @semantic-release/git
- [x] Create `release.config.mjs` with plugin configuration
- [x] Configure multi-registry in release.config.mjs (npm + GitHub)
- [x] Add `release` scope to commitlint.config.mjs (already existed)

### Phase 2: GitHub Actions Workflow

- [x] Create `.github/workflows/release.yml`
- [x] Configure trigger on main branch push only
- [x] Set required permissions (contents, issues, pull-requests, id-token)
- [x] Add checkout step with fetch-depth: 0
- [x] Add pnpm and Node.js setup steps
- [x] Add npm audit signatures step
- [x] Add semantic-release execution step
- [x] Configure environment variables (GITHUB_TOKEN, NPM_TOKEN)

### Phase 3: Package & Documentation [P]

- [x] Add `publishConfig` to package.json for GitHub registry
- [x] Create initial `CHANGELOG.md` (header only)
- [x] Add "Release Process" section to CONTRIBUTING.md
- [x] Document NPM_TOKEN secret requirement in CONTRIBUTING.md

### Phase 4: Validation

- [x] Run `pnpm install` to verify dependencies
- [x] Run `pnpm lint` to verify config files
- [x] Verify workflow YAML syntax
- [ ] Create PR for review
- [ ] Test release after merge (first actual release)

## Pre-Implementation Setup (Manual)

Before merging, these must be configured in GitHub:

- [ ] Create `NPM_TOKEN` secret in repository settings
- [ ] Verify @shep-ai org exists on npmjs.com
- [ ] Verify GitHub Package Registry is enabled for repo

## Parallelization Notes

- [P] Phase 3 tasks ran in parallel (independent file updates)
- Phase 1 completed before Phase 2 (workflow references deps)
- Phase 4 depends on all prior phases

## Acceptance Checklist

Before marking feature complete:

- [x] All implementation tasks completed
- [x] Dependencies installed (`pnpm install`)
- [x] Linting clean (`pnpm lint`)
- [x] Types valid (`pnpm typecheck`)
- [x] Workflow YAML valid
- [x] Documentation updated
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
