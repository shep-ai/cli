# Code Integrity Rules (STRICT)

## Never Dismiss Test Failures

- ALL test failures are your responsibility — no exceptions
- Never label failures as "unrelated", "pre-existing", or "not our changes"
- Never proceed past a failing test suite to commit, push, or claim completion
- If a test fails, investigate and fix it or explicitly escalate to the user with full context
- "It was already broken" is not an acceptable reason to ignore a failure

## No Silent Skipping

- Do not skip, ignore, or wave away errors, warnings, or failures in any tool output
- Do not cherry-pick passing results while hiding failing ones
- Report ALL failures to the user before proposing next steps

## Verification Before Completion

- Never claim work is "done", "passing", or "ready" without showing proof
- Run the relevant test suite and confirm zero failures before any completion claim
- If you cannot get all tests green, say so explicitly — do not minimize
