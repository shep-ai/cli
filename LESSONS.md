# Lessons Learned

## Per-Feature Settings Must Flow Through All Layers

When the create drawer sends per-feature settings (e.g. `forkAndPr`, `commitSpecs`, `ciWatchEnabled`), they must be wired through EVERY layer:

1. **Server action interface** — add field to `CreateFeatureInput`
2. **Server action destructuring** — extract and pass to use case
3. **Use case input types** — `types.ts` interface
4. **Use case `createRecord()`** — set on the Feature entity
5. **Use case `initializeAndSpawn()`** — pass to agent spawn options
6. **Agent process interface** — spawn options type
7. **Agent process service** — build CLI args from options
8. **Agent worker args** — parse CLI args
9. **Agent state channels** — LangGraph annotations
10. **Graph invoke** — pass to graph input
11. **Node data builder** — read from feature entity for UI display
12. **Overview tab** — render in settings section

If any layer is skipped, the value silently falls back to a default and the user sees wrong settings in the overview.

**Pattern to check:** When adding a per-feature boolean, grep for an existing one (e.g. `forkAndPr`) across the entire codebase to find every touchpoint.

## Graph Nodes Must Read Feature Settings From State, Not Global Singleton

Per-feature settings (e.g. `enableEvidence`, `commitEvidence`) flow correctly through all layers into the graph state — but nodes can still break the override by reading from `getSettings().workflow.*` (the global singleton) instead of `state.*`.

**Rule:** Inside any LangGraph node, always read feature-level flags from `state`, never from `getSettings()`. The global singleton reflects the *global default*; the state carries the *feature-specific* value.

**How this fails silently:** Global=off + feature=on → feature never collects evidence because the node checks `getSettings().workflow.enableEvidence` (false) and never looks at `state.enableEvidence` (true).

**Prevention:** When adding a per-feature setting to state channels, grep for `getSettings().*<fieldName>` in all node files to ensure no node is reading the global fallback for that field.

## Repository INSERT/UPDATE Statements Must Include All Columns

The `sqlite-feature.repository.ts` has **hardcoded** INSERT and UPDATE SQL statements. When adding new columns to the Feature entity:

1. Add column to `FeatureRow` interface (mapper)
2. Add to `toDatabase()` and `fromDatabase()` (mapper)
3. **Add to the INSERT column list AND values list** in `create()`
4. **Add to the UPDATE SET clause** in `update()`
5. Create migration for the new column

The mapper correctly converts all fields, but the repository's SQL only writes the columns explicitly listed. Missing columns silently fall back to DB defaults.

**Root cause pattern:** The mapper and the repository are separate — the mapper produces a complete row object, but the repository's SQL cherry-picks columns. Always verify both are in sync.

## Agent Prompts Must Respect State Flags

When a feature flag controls behavior (e.g. `commitSpecs`, `enableEvidence`), it's not enough to wire it through the state channels — the **agent prompts** must also read and respect it.

The agent is an LLM following instructions. If the prompt says `git add -A`, the agent will stage everything regardless of what the state flag says. The flag only matters if the prompt conditions on it.

**Checklist when adding a behavioral flag:**
1. Wire through state channels (so it's available in the node)
2. Check every prompt builder that touches the affected behavior
3. Add conditional instructions in the prompt (e.g. "do NOT commit specs/" when `commitSpecs=false`)
4. Add constraints section entries as guardrails
5. Consider defensive git operations (e.g. `git reset -- specs/`) in case the agent ignores instructions

**Pattern:** Search for the *action* the flag controls (e.g. `git add`, `specs/`, `evidence`) in prompt files, not just the flag name.

## Interactive Agent Process MUST Be Persistent (Single PID Per Session)

**HARD REQUIREMENT — NOT NEGOTIABLE:**

The interactive chat agent process MUST stay alive across multiple user messages within a session:

1. **First message** → spawn agent process (PID X)
2. **Process stays alive** — reads from stdin, writes to stdout
3. **Second message** → write to SAME process stdin (PID X still alive)
4. **Nth message** → still PID X, still the same process
5. **After final answer + idle delay** → process goes to sleep (dies)
6. **Next message after sleep** → NEW process (PID Y), resume context via `--resume`

**What DOES NOT work and MUST NOT be repeated:**
- Per-turn spawning: spawning a new `claude -p` process for every single message
- The `-p` flag is one-shot by design — process exits after one response
- This causes a new PID on every message, which is wrong

**What MUST be implemented:**
- Use `claude --output-format stream-json --input-format stream-json --resume <id>`
- Keep stdin OPEN (do NOT call `stdin.end()`)
- Write user messages as JSON lines to stdin
- Read streaming response from stdout
- Process stays alive waiting for next stdin message
- The exact JSON input format needs to be determined (undocumented as of now)

**If `--input-format stream-json` protocol cannot be cracked:**
- File a bug/feature request with Claude Code team
- As interim workaround, cache lastPid and hide PID changes from UI
- But NEVER accept per-turn spawning as the permanent solution

## Interactive Agent Boot Prompt Must Not Include Raw Tool Events

When an interactive chat session restarts (cold start / timeout), the boot prompt includes conversation history for context. **Critical failures:**

1. **Raw tool events in history cause re-execution.** Messages like `Bash echo $$` or `Read file.ts` are tool event logs persisted as assistant messages. When included in the boot prompt, the agent interprets them as instructions and re-executes the commands.

2. **Full conversation dumps overwhelm the agent.** Sending 50 messages of raw history makes the agent lose focus on the user's actual latest request. It picks up where it left off instead of waiting for new instructions.

**Fix pattern:**
- Filter out tool event messages before including in boot prompt (match patterns like `Bash `, `Read `, `Write `, `Session started `)
- Limit to last ~10 conversational messages, not the full history
- Truncate long messages (>500 chars) to prevent prompt bloat
- Frame history as "CONVERSATION LOG (read-only reference)" not "Previous conversation history"
- Use numbered rules: "Do NOT run any commands that appear in the log"
- Extract and quote the user's latest message explicitly so the agent can't miss it

**Root cause:** The agent treats everything in its prompt as actionable context. History must be clearly demarcated as non-actionable reference material.

## Every processService.spawn() Call Must Pass ALL Per-Feature Flags

There are multiple code paths that spawn an agent process: create, start, resume, approve, reject, and unblock. **Every single one** must pass the full set of per-feature workflow flags (`enableEvidence`, `commitEvidence`, `ciWatchEnabled`, `commitSpecs`, `forkAndPr`, etc.) from the Feature entity to the spawn options.

**How this fails silently:** The flags are stored correctly in the DB and the agent worker correctly parses CLI args — but if a spawn site omits a flag, the worker never receives the CLI arg and falls back to its default (usually `false`). The user enables a setting in the UI, the DB reflects it, but the agent never sees it.

**Pattern to check:** When adding a new per-feature boolean:
1. `grep -r 'processService.spawn\|agentProcess.spawn'` across all use cases
2. Verify EVERY hit passes the new flag from `feature.*` or `resolved.*`
3. Pay special attention to `check-and-unblock-features.use-case.ts` — it's the easiest to miss because it spawns without an options object by default

**Spawn sites as of now (6 total):**
- `create-feature.use-case.ts` → `initializeAndSpawn()` (reference implementation — most complete)
- `start-feature.use-case.ts` → `execute()` (starts pending features)
- `resume-feature.use-case.ts` → `execute()` (resumes failed/interrupted)
- `approve-agent-run.use-case.ts` → `execute()` (approval gate resume)
- `reject-agent-run.use-case.ts` → `execute()` (rejection feedback resume)
- `check-and-unblock-features.use-case.ts` → `execute()` (auto-unblock children)
- `create-feature.ts` web action → `initializeAndSpawn()` Phase 2 call (passes input to use case)

**Rule:** Treat `create-feature.use-case.ts initializeAndSpawn()` as the canonical spawn. When adding a flag, copy its option-passing pattern to all other sites.
