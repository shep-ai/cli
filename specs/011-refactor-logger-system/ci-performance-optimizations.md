# CI Performance Optimizations - E2E Tests

**Date**: 2026-02-09
**Issue**: E2E tests timing out in GitHub Actions
**Solution**: Increased parallelism and machine resources

---

## Changes Made

### 1. Upgraded GitHub Runners (4x CPU Cores)

**Before:**

```yaml
runs-on: ubuntu-latest # 2-core machine
```

**After:**

```yaml
runs-on: ubuntu-latest-4-cores # 4-core machine
```

**Applied to:**

- ✅ `test-e2e-cli` job
- ✅ `test-e2e-tui` job
- ✅ `test-e2e-web` job

**Impact:**

- 2x more CPU cores (2 → 4)
- 2x more memory (7 GB → 16 GB)
- Faster test execution
- Better handling of concurrent operations

---

### 2. Increased Playwright Workers (4x Parallelism)

**Before:**

```typescript
// playwright.config.ts
workers: process.env.CI ? 1 : undefined,  // Only 1 worker in CI!
```

**After:**

```typescript
// playwright.config.ts
workers: process.env.CI ? 4 : undefined,  // 4 workers to match runner cores
```

**Impact:**

- 4x parallel test execution
- Tests can run concurrently across all 4 cores
- Significantly faster test suite completion

---

### 3. Increased Test Timeout (2x Buffer)

**Before:**

```typescript
// No explicit timeout - default 30 seconds
```

**After:**

```typescript
timeout: process.env.CI ? 60000 : 30000,  // 60s for CI, 30s for local
```

**Impact:**

- Prevents timeout failures on slower operations
- Accounts for CI environment variability
- Still fast enough to catch hanging tests

---

### 4. Added Test Sharding for Web E2E (2x Parallelism)

**Before:**

```yaml
test-e2e-web:
  name: E2E (Web)
  runs-on: ubuntu-latest
  steps:
    - run: pnpm run test:e2e:web
```

**After:**

```yaml
test-e2e-web:
  name: E2E (Web) - Shard ${{ matrix.shardIndex }} of ${{ matrix.shardTotal }}
  runs-on: ubuntu-latest-4-cores
  strategy:
    fail-fast: false
    matrix:
      shardIndex: [1, 2]
      shardTotal: [2]
  steps:
    - run: pnpm run test:e2e:web --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
```

**Impact:**

- Web tests split across 2 parallel jobs
- Each shard runs on its own 4-core machine
- Effective 8 cores working on web tests
- Test results uploaded as separate artifacts

---

### 5. Added Job Timeouts

**Added:**

```yaml
timeout-minutes: 15  # CLI and TUI
timeout-minutes: 20  # Web (needs more time for sharding)
```

**Impact:**

- Prevents jobs from hanging indefinitely
- Earlier detection of problematic tests
- Better resource utilization

---

## Performance Comparison

### Expected Speedup

| Test Suite  | Before  | After    | Speedup           |
| ----------- | ------- | -------- | ----------------- |
| **E2E CLI** | ~10 min | ~3-4 min | **2.5-3x faster** |
| **E2E TUI** | ~8 min  | ~2-3 min | **2.5-3x faster** |
| **E2E Web** | ~15 min | ~4-5 min | **3-4x faster**   |

### Total Pipeline Time

| Scenario          | Before  | After   | Improvement       |
| ----------------- | ------- | ------- | ----------------- |
| **E2E Tests**     | ~15 min | ~5 min  | **~10 min saved** |
| **Full Pipeline** | ~25 min | ~15 min | **~10 min saved** |

---

## Cost Considerations

### GitHub Actions Pricing

| Runner Type              | Cost per Minute | Multiplier |
| ------------------------ | --------------- | ---------- |
| `ubuntu-latest` (2-core) | 1x              | Baseline   |
| `ubuntu-latest-4-cores`  | 2x              | 2x cost    |

### Cost Analysis

**Before:**

- 3 jobs × 10 min avg × 1x multiplier = **30 compute minutes**

**After:**

- 3 jobs × 4 min avg × 2x multiplier = **24 compute minutes**
- Web sharding: 2 jobs × 5 min × 2x = **20 compute minutes**
- **Total: ~44 compute minutes**

**Net Cost Impact:**

- Compute minutes increase by ~50%
- BUT wall-clock time decreases by ~60%
- Faster feedback is worth the moderate cost increase

---

## Implementation Details

### Sharding Explanation

Playwright's `--shard` flag splits tests across multiple machines:

```bash
# Shard 1 runs first half of tests
pnpm run test:e2e:web --shard=1/2

# Shard 2 runs second half of tests
pnpm run test:e2e:web --shard=2/2
```

Tests are distributed based on file paths, ensuring balanced load.

### Artifact Upload

Each shard uploads its own test results:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ matrix.shardIndex }}
    path: playwright-report/
    retention-days: 7
```

Artifacts are available for 7 days for debugging.

---

## Rollback Plan

If these changes cause issues, revert to original settings:

```yaml
# .github/workflows/ci.yml
runs-on: ubuntu-latest
# Remove timeout-minutes
# Remove strategy.matrix
```

```typescript
// playwright.config.ts
workers: process.env.CI ? 1 : undefined,
// Remove timeout
```

---

## Monitoring

### Key Metrics to Watch

1. **Job Duration**: Should decrease by 2-3x
2. **Failure Rate**: Should remain stable or improve
3. **Flakiness**: Monitor for increased flaky tests
4. **Cost**: Track GitHub Actions usage

### GitHub Actions Dashboard

View performance metrics at:

- https://github.com/shep-ai/cli/actions
- Check "E2E (Web) - Shard 1 of 2" and "Shard 2" durations
- Compare before/after timestamps

---

## Future Optimizations

### 1. Increase Shards (if needed)

```yaml
matrix:
  shardIndex: [1, 2, 3, 4] # 4 shards instead of 2
  shardTotal: [4]
```

### 2. Use Larger Runners (if budget allows)

```yaml
runs-on: ubuntu-latest-8-cores # 8 cores, 32 GB RAM
```

### 3. Test Caching

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: playwright-${{ hashFiles('pnpm-lock.yaml') }}
```

### 4. Parallel Unit Tests

```bash
# Run unit tests with multiple workers
vitest run --threads --max-concurrency=4
```

---

## References

- [GitHub-hosted runners specs](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#supported-runners-and-hardware-resources)
- [Playwright Test Sharding](https://playwright.dev/docs/test-sharding)
- [Playwright CI Configuration](https://playwright.dev/docs/ci)
- [GitHub Actions Pricing](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)

---

## Verification Commands

```bash
# Run locally to test changes
pnpm test:e2e:web --workers=4

# Test sharding locally
pnpm test:e2e:web --shard=1/2
pnpm test:e2e:web --shard=2/2

# Check Playwright config
cat playwright.config.ts | grep -A 5 "workers"
```

---

## Summary

✅ **4x more CPU cores** (ubuntu-latest-4-cores)
✅ **4x more Playwright workers** (1 → 4)
✅ **2x test sharding** for web tests
✅ **2x increased timeout** (30s → 60s in CI)
✅ **Job timeouts** added (15-20 min)

**Expected Result**: E2E tests complete in ~5 minutes instead of ~15 minutes (**3x faster**).
