# Operational Discipline (STRICT)

## THINK BEFORE EVERY ACTION

Before EVERY tool call, ask: **"Is this the smartest way to do this, or am I taking a shortcut that will cost more later?"**

Three checkpoints:

1. **"What could go wrong?"** — If this fails or returns unexpected output, will I have what I need to diagnose it? If not, adjust BEFORE running.
2. **"Am I being lazy?"** — Is there a smarter approach that takes 2 more seconds of thought but saves minutes of wasted work?
3. **"Am I wasting resources?"** — Could I reuse previous output, validate locally, or avoid repeating work?

If you skip this step, you WILL do something stupid. Every preventable mistake in this project has been caused by acting before thinking.

## NEVER DISCARD OUTPUT YOU MIGHT NEED

When running ANY command that could fail or produce diagnostic information, save the full output to a temp file and then display a summary:

```bash
some-command 2>&1 | tee /tmp/cmd-out.txt | tail -30
# Need more? Read the file — NEVER re-run the command.
```

NEVER pipe through `tail` or `head` alone without also saving to a file. You cannot predict where the useful information will be — capture everything, display a summary, read more from the file if needed.

NEVER re-run an expensive command just to see a different slice of its output.

## VALIDATE LOCALLY BEFORE REMOTE

Any validation that CAN be done locally MUST be done locally first. Remote systems (CI, staging, etc.) confirm — they do not discover. If you're using a remote system as your first line of validation, you're being lazy.
