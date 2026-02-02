# Tasks: cicd-security-gates

> Task breakdown for 003-cicd-security-gates

## Status

- **Phase:** Complete
- **Updated:** 2026-02-02

## Task List

### Phase 1: Add Security Scanning Job

- [x] Add `security` job to `.github/workflows/ci.yml`
  - [x] Add job definition with `runs-on: ubuntu-latest`
  - [x] Add Trivy filesystem scan step (deps + IaC)
  - [x] Add Gitleaks secret detection step
  - [x] Add Semgrep SAST step (TypeScript/JavaScript rules)
  - [x] Add Hadolint Dockerfile linting step
  - [x] Configure severity thresholds (HIGH/CRITICAL)

### Phase 2: Wire Security to Release Gate

- [x] Update `release` job `needs` array to include `security`
- [ ] Verify release only runs when security passes on main (manual verification after merge)

### Phase 3: Update Documentation

- [x] Update CI/CD header diagram to include Security job
- [x] Add Security section to pipeline structure comment

## Implementation Details

### Trivy Configuration

```yaml
- name: Trivy vulnerability scan
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    scan-ref: '.'
    severity: 'HIGH,CRITICAL'
    exit-code: '1'
```

### Gitleaks Configuration

```yaml
- name: Gitleaks secret scan
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Semgrep Configuration

```yaml
- name: Semgrep SAST scan
  uses: returntocorp/semgrep-action@v1
  with:
    config: >-
      p/typescript
      p/javascript
      p/security-audit
```

### Hadolint Configuration

```yaml
- name: Hadolint Dockerfile lint
  uses: hadolint/hadolint-action@v3.1.0
  with:
    dockerfile: Dockerfile
    failure-threshold: warning
```

## Parallelization Notes

- All tasks are sequential (single file modification)
- Security job runs in parallel with other CI jobs
- Internal scanner steps run sequentially within the job

## Acceptance Checklist

Before marking feature complete:

- [x] All tasks completed
- [ ] Security job appears in GitHub Actions (verify after push)
- [ ] All 4 scanners run successfully (verify after push)
- [x] Release job depends on security on main branch
- [x] CI header documentation updated
- [x] Commit follows conventional commits format
- [x] Update all spec files to Phase: Complete

---

_Task breakdown for implementation tracking_
