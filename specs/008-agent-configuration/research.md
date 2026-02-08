# Research: agent-configuration

> Technical analysis for 008-agent-configuration

## Status

- **Phase:** Research
- **Updated:** 2026-02-08

## Technology Decisions

### TD-1: Interactive Prompt Library for TUI Wizard

**Options considered:**

1. **@inquirer/prompts** (v8.2.0) — Modern ESM-first rewrite of Inquirer.js
2. **@clack/prompts** (v1.0.0) — Beautiful out-of-the-box prompts by Bomb.sh
3. **enquirer** (v2.4+) — Lightweight alternative with custom themes

**Decision:** `@inquirer/prompts`

**Rationale:**

- **28M+ weekly downloads** — largest community and most battle-tested
- **Native disabled option support** — `disabled: '(Coming Soon)'` on select choices is exactly what we need for WIP agents
- **Separator support** — clean grouping of agent categories
- **Description support** — each choice can show contextual description text
- **ESM-first** — aligns with our ESM module system
- **Individual package imports** — `@inquirer/select`, `@inquirer/confirm`, etc. for tree-shaking
- **Theme system** — customizable styling that can integrate with our CLI design system colors
- **TypeScript-native** — full type safety with generics on select/confirm/input

`@clack/prompts` was attractive for visual polish but lacks disabled option support and has poor documentation for complex use cases. `enquirer` hasn't had active maintenance recently.

### TD-2: Agent Configuration Storage Strategy

**Options considered:**

1. **Flat columns in settings table** — Add `agent_type`, `agent_auth_method`, `agent_token` columns via migration
2. **JSON column** — Store agent config as serialized JSON in a single `agent_config TEXT` column
3. **Separate agent_config table** — Normalized table with agent-specific rows

**Decision:** Flat columns in settings table (option 1)

**Rationale:**

- **Consistent with existing pattern** — Settings table already uses flat columns for nested objects (models._, user._, env._, sys._)
- **Type-safe queries** — SQLite can validate NOT NULL constraints per column
- **Simple migration** — ALTERs are straightforward `ALTER TABLE settings ADD COLUMN`
- **Mapper pattern** — Existing `toDatabase`/`fromDatabase` mapper easily extends with new columns
- **No JSON parsing overhead** — Direct column reads vs JSON.parse for every settings load

JSON column was considered but would break the established flat-column pattern and lose per-field constraints. Separate table adds join complexity for a singleton entity.

**Column schema for migration 002:**

```sql
agent_type TEXT NOT NULL DEFAULT 'claude-code',
agent_auth_method TEXT NOT NULL DEFAULT 'session',
agent_token TEXT  -- nullable, only used for token-based auth
```

### TD-3: Claude Code Authentication Detection

**Options considered:**

1. **Check `claude --version`** — Verify binary exists and is functional
2. **Check `claude auth status`** — Verify both binary and active auth session (if such command exists)
3. **Check binary + environment variables** — Binary existence + `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN`

**Decision:** Binary check (`which claude` or `claude --version`) for agent availability, plus auth method stored in settings

**Rationale:**

- Claude Code authentication is managed by Claude Code itself (macOS Keychain, OAuth session)
- For "Use existing session" auth mode: we only need to verify `claude` binary is available — Claude Code handles its own auth when invoked
- For "Use API token" auth mode: user provides token during wizard, we store it, and set `ANTHROPIC_API_KEY` environment variable when invoking Claude Code
- No need to probe Claude Code's internal auth state — if the session is expired, Claude Code will handle re-auth
- `claude --version` serves dual purpose: verifies binary exists AND returns version info for diagnostics

### TD-4: TypeSpec Model Strategy for Agent Config

**Options considered:**

1. **Discriminated union** — Use TypeSpec `@discriminated` decorator for polymorphic agent configs
2. **Simple flat model** — Single `AgentConfig` model with optional fields per agent type
3. **Enum + flat config** — AgentType enum paired with flat config model

**Decision:** Enum + flat config (option 3)

**Rationale:**

- **TypeSpec TS emitter limitation** — The `@typespec-tools/emitter-typescript` we use generates flat TypeScript types; discriminated unions with `@discriminated` decorator produce complex OpenAPI `oneOf` schemas that don't map cleanly to our flat TypeScript type generation pipeline
- **Matches existing patterns** — Settings already uses simple enums (log level is a string, editor is a string) without discriminated types
- **SQLite compatibility** — Flat columns in settings table map directly to flat model fields
- **YAGNI** — We only support Claude Code now. When adding Gemini CLI etc., we can extend the flat model with optional fields per agent, or introduce a separate config table at that point
- **Simpler mapper** — `toDatabase`/`fromDatabase` stays simple without union type branching

**TypeSpec model design:**

```typespec
enum AgentType {
  ClaudeCode: "claude-code",
  GeminiCli: "gemini-cli",
  Aider: "aider",
  Continue: "continue",
  Cursor: "cursor",
}

enum AgentAuthMethod {
  Session: "session",
  Token: "token",
}

model AgentConfig {
  type: AgentType = AgentType.ClaudeCode;
  authMethod: AgentAuthMethod = AgentAuthMethod.Session;
  token?: string; // only for token-based auth
}
```

### TD-5: Folder Organization for Extensibility

**Decision:** Group agent-related code by concern, not by agent type, at the current scale

**Rationale:**

- With only one agent (Claude Code) and two more types (enum values), creating deep per-agent folder trees would be premature
- **TypeSpec:** `tsp/common/enums/agent-config.tsp` for the new enum + config models (alongside existing enums)
- **Use cases:** `src/application/use-cases/agents/` directory with `configure-agent.use-case.ts` and `validate-agent-auth.use-case.ts`
- **Infrastructure services:** `src/infrastructure/services/agents/` directory with `agent-validator.service.ts` (checks binary availability)
- **CLI command:** `src/presentation/cli/commands/settings/agent.command.ts` (within existing settings group)
- When a second agent implementation requires significant agent-specific code (adapters, auth flows), we create per-agent subdirectories at that point

## Library Analysis

| Library              | Version       | Purpose                                  | Pros                                                                 | Cons                                      |
| -------------------- | ------------- | ---------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| `@inquirer/prompts`  | 8.2.0         | Interactive CLI wizard prompts           | 28M+ downloads, disabled options, separators, TypeScript-native, ESM | Heavier than clack, many sub-packages     |
| `@inquirer/select`   | (sub-package) | Single-choice selection for agent picker | Disabled + description support, keyboard nav                         | Must import individually for tree-shaking |
| `@inquirer/confirm`  | (sub-package) | Yes/no confirmation prompts              | Simple API, consistent with select                                   | N/A                                       |
| `@inquirer/password` | (sub-package) | Token input (masked)                     | Masks sensitive input, copy-paste friendly                           | N/A                                       |

No additional dependencies beyond `@inquirer/prompts` (which bundles select, confirm, password).

## Security Considerations

- **Token storage:** API tokens will be stored as plaintext in SQLite settings DB (`~/.shep/data`). The database file already has 0700 permissions on `~/.shep/` directory. For v1, this matches how other CLI tools store tokens (e.g., npm, gh). Future enhancement: consider OS keychain integration (macOS Keychain, libsecret on Linux) similar to Claude Code's own approach.
- **Token in memory:** Token is read into memory via `getSettings()` singleton. Ensure it's not logged or included in error reports.
- **Token input masking:** Use `@inquirer/password` for token entry in the wizard to prevent shoulder surfing.
- **No token in git:** Settings DB is in `~/.shep/data` (outside repo), so tokens can never be accidentally committed.
- **Environment variable passthrough:** When invoking Claude Code with token-based auth, set `ANTHROPIC_API_KEY` via process environment (not command-line arg) to avoid token exposure in process listings.

## Performance Implications

- **Startup cost:** Adding `@inquirer/prompts` as a dependency adds ~200KB to node_modules but is only imported when `shep settings agent` is invoked (lazy import in command handler), so it adds zero overhead to other commands.
- **Binary check cost:** `which claude` or `claude --version` adds ~50-100ms subprocess spawn. Run only during agent configuration wizard, not on every CLI startup.
- **Migration cost:** ALTERing the settings table with 3 new columns is near-instant for a singleton table.
- **Mapper overhead:** Adding 3 more field mappings to `toDatabase`/`fromDatabase` is negligible.

## Open Questions

All questions resolved.

**Resolved during research:**

- [x] **@inquirer/prompts compatibility** — Confirmed ESM-first, TypeScript-native, supports disabled choices with string reason
- [x] **Claude Code auth detection** — Binary check sufficient; Claude Code manages its own auth session internally
- [x] **TypeSpec union support** — TypeSpec `@discriminated` exists but TS emitter doesn't generate clean discriminated unions; flat model + enum is pragmatic
- [x] **Migration strategy** — ALTER TABLE ADD COLUMN works for SQLite; consistent with flat-column pattern
- [x] **Token security** — Plaintext in SQLite is acceptable for v1 (same as npm, gh, etc.); OS keychain is future enhancement

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
