# CI/CD Rules (STRICT)

## Pre-Push Local Verification

- Before pushing, run every CI check that can execute locally — catch failures in seconds, not minutes
- The local verification sequence mirrors CI and MUST pass before any push:
  1. `pnpm lint` + `pnpm format:check` — code quality
  2. `pnpm typecheck` — type safety
  3. `pnpm test:unit && pnpm test:int` — correctness
  4. `pnpm build` — compilation
- If ANY local check fails, fix it before pushing — do not push and hope CI passes
- For UI changes, also run `pnpm build:storybook` locally — broken stories are a CI failure
- For E2E-affecting changes, run the relevant `pnpm test:e2e:*` suite locally when feasible
- The goal is: **CI should never tell you something you could have caught locally**

## Watching CI Runs

- A single push can trigger MULTIPLE workflow runs (e.g., CI/CD + PR validation)
- You MUST verify ALL runs are complete before claiming CI passed
- Always run `gh run list --branch <branch> --json databaseId,status,conclusion` to check every run
- NEVER watch a single run ID and assume that's the only one
- NEVER claim "CI passed" until every run shows `status: completed`

## Verification Sequence

1. After push, list ALL runs: `gh run list --branch <branch> --json databaseId,status,conclusion`
2. Watch ALL in-progress runs (not just the first one)
3. **NEVER trust `gh run watch` exit status alone** — it can exit 0 while jobs are still running or have failed. After `gh run watch` completes, ALWAYS verify with `gh run list --branch <branch> --json databaseId,status,conclusion` to confirm every run shows `completed` + `success`.
4. Only after every run shows `completed` + `success`, report CI as passed
5. If any run fails, investigate — do not ignore it

## ABSOLUTE OWNERSHIP OF CI FAILURES

**You are the ONLY developer. Every CI failure is YOUR failure.**

- If E2E tests fail — fix them. They are YOUR tests.
- If security scans fail (Trivy, Semgrep, Gitleaks) — fix them. They are YOUR scans.
- If lint/typecheck/build fails — fix it. It is YOUR code.
- NEVER say a failure is "unrelated", "pre-existing", or "not our changes"
- NEVER dismiss a failure as an "infrastructure issue"
- NEVER claim CI passed when ANY job has failed
- If you truly cannot fix a failure, escalate to the user with full details — do NOT wave it away
