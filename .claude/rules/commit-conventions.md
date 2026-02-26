# Conventional Commits (STRICT)

You MUST output commit messages that pass ALL rules below.  
If you are asked to produce a commit message and your first attempt would violate any rule, you MUST self-correct and output only a valid commit message (no explanations).

## Format

<type>(<scope>): <subject>

## Allowed <type>

feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert

## Allowed <scope>

specs | shep-kit | cli | tui | web | api | domain | agents | deployment | tsp | deps | config | dx | release | ci

## <subject> rules

- MUST be lowercase only (a–z, 0–9, spaces, and hyphens only)
- MUST NOT be empty
- MUST NOT end with a period `.`
- MUST be <= 72 characters (subject only, not including `<type>(<scope>): `)
- SHOULD be an imperative phrase (e.g., "add", "fix", "remove", "refactor")

## Header rules (entire first line)

- MUST be <= 100 characters total
- MUST match this regex exactly:

^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)\((specs|shep-kit|cli|tui|web|api|domain|agents|deployment|tsp|deps|config|dx|release|ci)\): [a-z0-9][a-z0-9\- ]{0,71}$

## Body / Footer (optional)

If you include a body or footer:

- MUST have a blank line after the header
- Each line MUST be <= 100 characters
- Trailers (recommended for metadata) MUST use `Token: value` format, e.g.:
  - `BREAKING CHANGE: ...`
  - `Refs: #123`
  - `Co-authored-by: Name <email>`

## Output constraints

- When asked for a commit message, output ONLY the commit message text.
- Do NOT output code fences, quotes, bullets, or explanations.
- If the user request cannot be expressed within these constraints, output the closest valid commit message and keep details in the body.
