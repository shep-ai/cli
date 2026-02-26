# Merge Step Real-Git Integration Tests

Integration tests for `createMergeNode` using real git repositories in isolated temp directories.

## Test Matrix

| Test                        | push  | openPr | allowMerge | remote | Expected     | Status   |
| --------------------------- | ----- | ------ | ---------- | ------ | ------------ | -------- |
| commit-only-with-gate       | false | false  | false      | yes    | interrupt    | GREEN    |
| local-merge-no-push         | false | false  | true       | yes    | local merge  | it.fails |
| push-no-pr-merge            | true  | false  | true       | yes    | push + merge | it.fails |
| push-pr-with-gate           | true  | true   | false      | yes    | interrupt    | GREEN    |
| push-pr-auto-merge          | true  | true   | true       | yes    | PR merge     | it.fails |
| no-remote-override-merge    | true  | true   | true       | no     | local merge  | it.fails |
| no-remote-local-merge       | false | false  | true       | no     | local merge  | it.fails |
| undefined-gates-silent-skip | -     | -      | undefined  | yes    | no merge     | GREEN    |

## Known Bugs (it.fails tests)

Tests marked `it.fails` document known bugs and will **break CI when fixed** (signaling the fix landed):

1. **Mock executor doesn't merge** — The mock `IAgentExecutor` returns fake output but doesn't run `git merge`. `verifyMerge()` correctly throws. Affects: local-merge-no-push, push-no-pr-merge, no-remote-\*, no-remote-local-merge.
2. **verifyMerge skipped on PR path** — `merge.node.ts` guards `verifyMerge()` with `if (!prUrl)`, skipping verification when a PR was created. Affects: push-pr-auto-merge.

When fixing these bugs, change `it.fails` → `it` and verify the test passes.

## File Map

| File                  | Contents                                            |
| --------------------- | --------------------------------------------------- |
| `setup.ts`            | Git harness, exec adapters, deps/state factories    |
| `helpers.ts`          | `assertMergeLanded`, `assertMergeNotLanded`         |
| `fixtures.ts`         | `FAKE_PR_URL`, `makeMockExecutor`                   |
| `smoke.test.ts`       | Infrastructure smoke tests (harness, exec, specDir) |
| `gate-tests.test.ts`  | Interrupt tests (allowMerge=false)                  |
| `local-merge.test.ts` | Local merge bugs (3 tests, all it.fails)            |
| `push-merge.test.ts`  | Push + merge bug (1 test, it.fails)                 |
| `pr-merge.test.ts`    | PR merge bug (1 test, it.fails)                     |
| `skip-merge.test.ts`  | No-merge path (approvalGates=undefined)             |

## Adding a Test

1. Pick or create the test file matching your scenario category.
2. Import shared setup from `./setup.js`, helpers from `./helpers.js`, constants from `./fixtures.js`.
3. Follow the existing `beforeAll`/`afterAll`/`afterEach` pattern for settings init and cleanup.
4. Use `createGitHarness()` for remote scenarios, `createLocalOnlyHarness()` for no-remote.
5. Run: `pnpm test:int -- tests/integration/infrastructure/services/git/merge-step-real-git/`
