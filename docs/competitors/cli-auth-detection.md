# AI CLI Auth Detection — Claude Code, Cursor CLI, Gemini CLI

## Summary

| Tool            | Fastest Check        | ~Time  | Dedicated Command?     |
| --------------- | -------------------- | ------ | ---------------------- |
| **Claude Code** | `claude auth status` | ~200ms | Yes — JSON + exit code |
| **Cursor CLI**  | `agent status`       | ~200ms | Yes — exit code        |
| **Gemini CLI**  | File/env check       | ~5ms   | No                     |

---

## 1. Claude Code (`claude`)

### Dedicated command

```bash
claude auth status
# → {"loggedIn":true,"authMethod":"oauth_token","apiProvider":"firstParty"}
# Exit 0 = authenticated, non-zero = needs auth
```

### Instant file check (no subprocess)

```bash
test -f ~/.claude/.credentials.json   # OAuth
test -n "$ANTHROPIC_API_KEY"          # API key
```

### Env vars

- `ANTHROPIC_API_KEY` — Direct API key
- `CLAUDE_CODE_USE_BEDROCK` — AWS Bedrock auth
- `CLAUDE_CODE_USE_VERTEX` — Google Vertex auth
- `CLAUDE_CODE_OAUTH_TOKEN` — OAuth token override (SDK/IDE)

### Credential path

- `~/.claude/.credentials.json` (OAuth access/refresh tokens)

---

## 2. Cursor CLI (`agent`)

### Dedicated command

```bash
agent status
# Shows auth state, account details, endpoint settings
# Exit 0 = authenticated, non-zero = needs auth
```

### Instant env check (no subprocess)

```bash
test -n "$CURSOR_API_KEY"
```

### Env vars

- `CURSOR_API_KEY` — API key auth

### CLI flag

- `--api-key` — Pass API key directly

### Credential path

- Stored locally after `agent login` (exact path undocumented — likely OS keychain or `~/.cursor/`)

---

## 3. Gemini CLI (`gemini`)

### No dedicated auth command — must check files + env vars

```bash
# 1. API key (instant)
test -n "$GEMINI_API_KEY"

# 2. Auth type in settings
# ~/.gemini/settings.json → look for "selectedType": "gemini-api-key" | "google-account"

# 3. Google account login state
# ~/.gemini/google_accounts.json → "active": null = NOT logged in
```

### Env vars

- `GEMINI_API_KEY` — API key auth
- `GOOGLE_API_KEY` — Vertex API key
- `GOOGLE_APPLICATION_CREDENTIALS` — Service account JSON path

### Credential paths

- `~/.gemini/settings.json` — Auth type selection
- `~/.gemini/google_accounts.json` — Google account info (`"active"` field)

---

## Recommended Two-Tier Detection Strategy

### Tier 1 — Instant (~5ms, no subprocess spawn)

Check env vars + credential file existence. Sufficient for first-run detection.

| Tool   | Check                                                                             |
| ------ | --------------------------------------------------------------------------------- |
| Claude | `$ANTHROPIC_API_KEY` set OR `~/.claude/.credentials.json` exists                  |
| Cursor | `$CURSOR_API_KEY` set OR local credentials exist                                  |
| Gemini | `$GEMINI_API_KEY` set OR `~/.gemini/google_accounts.json` has non-null `"active"` |

If nothing exists → auth is **definitely** needed. No subprocess required.

### Tier 2 — Verify (~200ms, subprocess)

Confirm tokens aren't expired. Only run if Tier 1 passes.

| Tool   | Command              | Success                              |
| ------ | -------------------- | ------------------------------------ |
| Claude | `claude auth status` | Exit 0, JSON `loggedIn: true`        |
| Cursor | `agent status`       | Exit 0                               |
| Gemini | No command available | Trust Tier 1 or lightweight API ping |

---

## Sources

- [Cursor CLI Authentication](https://cursor.com/docs/cli/reference/authentication)
- [Cursor CLI Overview](https://cursor.com/docs/cli/overview)
- [Gemini CLI Authentication](https://geminicli.com/docs/get-started/authentication/)
