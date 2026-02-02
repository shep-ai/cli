# Plan: semantic-release-cicd

> Implementation plan for 002-semantic-release-cicd

## Status

- **Phase:** Planning
- **Updated:** 2026-02-02

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                               │
│                     .github/workflows/release.yml                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ on: push to main
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        semantic-release                              │
│                       release.config.mjs                             │
├─────────────────────────────────────────────────────────────────────┤
│  1. commit-analyzer     │ Analyze commits → determine version bump   │
│  2. release-notes       │ Generate release notes from commits        │
│  3. changelog           │ Update CHANGELOG.md                        │
│  4. npm-multiple        │ Publish to npm + GitHub Package Registry   │
│  5. github              │ Create GitHub Release with notes           │
│  6. git                 │ Commit package.json + CHANGELOG.md         │
└─────────────────────────────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
   ┌─────────────┐    ┌──────────────┐    ┌──────────────┐
   │  npm.pkg.   │    │ registry.    │    │   GitHub     │
   │  github.com │    │ npmjs.org    │    │   Releases   │
   │ (GPR)       │    │ (public npm) │    │              │
   └─────────────┘    └──────────────┘    └──────────────┘
```

## Implementation Strategy

### Phase 1: Dependencies & Configuration

Install semantic-release and all plugins as devDependencies. Create the `release.config.mjs` configuration file with the plugin stack. This is the foundation - nothing else works without it.

### Phase 2: GitHub Actions Workflow

Create `.github/workflows/release.yml` with proper permissions, environment variables, and job configuration. The workflow must:

- Trigger only on main branch pushes
- Run after CI checks pass
- Have correct permissions (contents, issues, pull-requests, id-token)
- Set up npm authentication for both registries

### Phase 3: Package Configuration & Documentation

Update `package.json` with `publishConfig` for GitHub registry. Add initial `CHANGELOG.md`. Update `CONTRIBUTING.md` to document the release process for contributors.

## Files to Create/Modify

### New Files

| File                            | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `release.config.mjs`            | semantic-release configuration with all plugins |
| `.github/workflows/release.yml` | GitHub Actions workflow for automated releases  |
| `CHANGELOG.md`                  | Changelog file (initially empty, auto-updated)  |

### Modified Files

| File              | Changes                                                 |
| ----------------- | ------------------------------------------------------- |
| `package.json`    | Add devDependencies, publishConfig for GitHub registry  |
| `CONTRIBUTING.md` | Add "Release Process" section explaining automated flow |

## Testing Strategy

### Unit Tests

- None required - this feature is configuration-only, no application code

### Integration Tests

- None required - no new application logic

### E2E Tests

- **Manual verification**: Merge a feat commit to main, verify:
  - Version bump in package.json
  - Package published to npm
  - Package published to GitHub Package Registry
  - GitHub Release created with changelog
  - CHANGELOG.md updated

### CI Verification

- Dry-run semantic-release in PR to validate config
- Verify workflow syntax with `actionlint` (optional)

## Risk Mitigation

| Risk                            | Mitigation                                                |
| ------------------------------- | --------------------------------------------------------- |
| NPM_TOKEN exposed               | Store as GitHub Secret, never in code                     |
| Publishing broken package       | CI must pass before release job runs (needs: [build])     |
| Version conflicts               | semantic-release handles this; git plugin commits version |
| GitHub API rate limits          | GITHUB_TOKEN has high limits; unlikely to hit             |
| Accidental release from feature | Workflow only triggers on main branch                     |
| npm org permission denied       | Verify @shep-ai org exists on npm before first publish    |

## Rollback Plan

If a bad version is published:

1. **npm**: `npm unpublish @shep-ai/cli@<version>` (within 72 hours)
2. **GitHub Package Registry**: Delete package version from GitHub UI
3. **GitHub Release**: Delete release from GitHub UI
4. **CHANGELOG.md**: Revert commit that added bad entry
5. **Prevent future**: semantic-release won't re-release same commits

If the workflow itself is broken:

1. Disable workflow via GitHub UI or delete `release.yml`
2. Fix configuration on a feature branch
3. Merge fix to main
4. Re-enable workflow

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
