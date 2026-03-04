# CI/CD Rules (STRICT)

## Watching CI Runs

- A single push can trigger MULTIPLE workflow runs (e.g., CI/CD + PR validation)
- You MUST verify ALL runs are complete before claiming CI passed
- Always run `gh run list --branch <branch> --json databaseId,status,conclusion` to check every run
- NEVER watch a single run ID and assume that's the only one
- NEVER claim "CI passed" until every run shows `status: completed`

## Verification Sequence

1. After push, list ALL runs: `gh run list --branch <branch> --json databaseId,status,conclusion`
2. Watch ALL in-progress runs (not just the first one)
3. Only after every run shows `completed` + `success`, report CI as passed
4. If any run fails, investigate — do not ignore it
