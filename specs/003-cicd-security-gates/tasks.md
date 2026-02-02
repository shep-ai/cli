# Tasks: cicd-security-gates

> Task breakdown for 003-cicd-security-gates

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-02

## Task List

### Phase 1: Add Security Scanning Job

- [ ] Add `security` job to `.github/workflows/ci.yml`
  - [ ] Add job definition with `runs-on: ubuntu-latest`
  - [ ] Add Trivy filesystem scan step (deps + IaC)
  - [ ] Add Gitleaks secret detection step
  - [ ] Add Semgrep SAST step (TypeScript/JavaScript rules)
  - [ ] Add Hadolint Dockerfile linting step
  - [ ] Configure severity thresholds (HIGH/CRITICAL)

### Phase 2: Wire Security to Release Gate

- [ ] Update `release` job `needs` array to include `security`
- [ ] Verify release only runs when security passes on main

### Phase 3: Update Documentation

- [ ] Update CI/CD header diagram to include Security job
- [ ] Add Security section to pipeline structure comment

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

- [ ] All tasks completed
- [ ] Security job appears in GitHub Actions
- [ ] All 4 scanners run successfully
- [ ] Release job depends on security on main branch
- [ ] CI header documentation updated
- [ ] Commit follows conventional commits format
- [ ] Update all spec files to Phase: Complete

---

_Task breakdown for implementation tracking_
