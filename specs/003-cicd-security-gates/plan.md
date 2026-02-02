# Plan: cicd-security-gates

> Implementation plan for 003-cicd-security-gates

## Status

- **Phase:** Planning
- **Updated:** 2026-02-02

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD Pipeline                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  All Branches (Parallel Jobs):                                               │
│  ┌──────┬───────────┬────────┬─────────┬─────────┬─────────┬────────┬──────┐│
│  │ Lint │ Typecheck │  Unit  │ E2E CLI │ E2E TUI │ E2E Web │ Docker │ Sec  ││
│  │      │           │ Tests  │         │         │         │        │ scan ││
│  └──────┴───────────┴────────┴─────────┴─────────┴─────────┴────────┴──────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│  Security Job Detail (internal parallelization):                             │
│  ┌──────────────────────────────────────────────────────────────────────────┐│
│  │  security:                                                                ││
│  │  ├─ Step 1: Checkout                                                     ││
│  │  ├─ Step 2: Trivy (fs scan for deps + IaC)                              ││
│  │  ├─ Step 3: Gitleaks (secret detection)                                  ││
│  │  ├─ Step 4: Semgrep (SAST for TS/JS)                                    ││
│  │  └─ Step 5: Hadolint (Dockerfile lint)                                   ││
│  └──────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│  Main Branch Only:                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Release (needs: lint, typecheck, test-unit, e2e-*, security)          │  │
│  │  └─ npm publish + Docker push (only if ALL jobs pass)                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Add Security Scanning Job

Add a new `security` job to `.github/workflows/ci.yml` that runs all four security scanners as sequential steps within a single job. This approach:

- Minimizes GitHub Actions runner overhead (one runner vs four)
- Steps run sequentially but job runs in parallel with other CI jobs
- Single job makes it easy to add to release `needs` array

**Scanners configured:**

1. **Trivy** - filesystem scan for dependency vulnerabilities
2. **Gitleaks** - git history secret detection
3. **Semgrep** - SAST with TypeScript/JavaScript rulesets
4. **Hadolint** - Dockerfile best practices

### Phase 2: Wire Security to Release Gate

Modify the `release` job to depend on the `security` job:

- Add `security` to the `needs` array
- Security failures now block npm publish and Docker push on main
- Non-main branches see security results but aren't blocked

### Phase 3: Update Documentation

Update the CI/CD pipeline documentation header to reflect the new security scanning job in the pipeline diagram.

## Files to Create/Modify

### New Files

| File | Purpose                                    |
| ---- | ------------------------------------------ |
| None | All scanners use default configs initially |

### Modified Files

| File                       | Changes                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `.github/workflows/ci.yml` | Add `security` job, update `release.needs`, update header diagram |

**Note:** Config files (`.gitleaks.toml`, `.trivyignore`, `.semgrep.yml`) can be added later if false positives need suppression.

## Testing Strategy

### Unit Tests

- N/A (no application code changes)

### Integration Tests

- N/A (no application code changes)

### E2E Tests

- **Manual verification**: Push branch and verify security job runs
- **Main branch test**: Merge to main and verify release waits for security

### Validation

- Verify all 4 scanners execute without errors
- Verify severity thresholds (HIGH/CRITICAL only fail the build)
- Verify release job shows `security` in needs on main branch

## Risk Mitigation

| Risk                           | Mitigation                                                           |
| ------------------------------ | -------------------------------------------------------------------- |
| False positives block releases | Configure severity to HIGH/CRITICAL only; add ignore files if needed |
| Scanner action versions break  | Pin to specific versions (`@v1`, `@v3`, etc.)                        |
| Increased CI time              | Steps run in one job; total ~2-3 min added                           |
| Semgrep licensing changes      | Monitor; can switch to Opengrep fork if needed                       |

## Rollback Plan

1. Remove `security` from `release.needs` array (immediate unblock)
2. Comment out or delete `security` job entirely
3. Revert commit via `git revert`

Single file change makes rollback trivial.

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
