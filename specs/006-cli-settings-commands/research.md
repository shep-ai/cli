# Research: cli-settings-commands

> Technical analysis for 006-cli-settings-commands

## Status

- **Phase:** Planning
- **Updated:** 2026-02-05

## Technology Decisions

### 1. CLI Table Library

**Options considered:**

1. **cli-table3** - Popular, actively maintained fork of cli-table with advanced features
2. **table** - Lightweight, emphasizes simplicity and ease of use
3. **console-table-printer** - Advanced features with colorized output
4. **text-table** - Extremely simple, plain text only

**Decision:** **cli-table3**

**Rationale:**

- Most popular (19M+ weekly downloads) with strong community support
- TypeScript-friendly with `@types/cli-table3` available
- Advanced features we'll need: cell spanning, custom styles, color support, word wrapping
- API compatible with the original cli-table (if we need to migrate)
- Already integrated with picocolors (our existing color library via ui/colors.ts)
- Battle-tested in production CLI tools

**Sources:**

- [cli-table3 vs table comparison](https://npm-compare.com/ascii-table,blessed,cli-table,cli-table3,table)
- [Node.js CLI libraries overview](https://byby.dev/node-command-line-libraries)

### 2. YAML Library

**Options considered:**

1. **js-yaml** - Established YAML 1.2 parser, 23K+ projects depend on it
2. **yaml** - Modern alternative with advanced features and better API
3. **yamljs** - Older, less actively maintained

**Decision:** **js-yaml**

**Rationale:**

- Industry standard with proven stability (used by 23,137+ npm projects)
- Better parsing performance than `yaml` package
- TypeScript definitions available via `@types/js-yaml`
- Simpler API for our use case (we only need dump/load)
- Lower risk choice for foundational CLI infrastructure
- Though `yaml` has more active development, js-yaml's maturity and performance for reading (our primary use case) make it the better choice

**Trade-off:** `yaml` package has faster writing and a more modern API, but we prioritize read performance and stability for this foundational feature.

**Sources:**

- [js-yaml vs yaml comparison](https://npm-compare.com/js-yaml,yaml,yamljs)
- [YAML libraries performance discussion](https://github.com/eemeli/yaml/discussions/358)

### 3. Database Metrics to Display

**Decision:** Display the following metadata:

- **Database path** - Full path to `~/.shep/data`
- **File size** - Human-readable size (e.g., "32 KB")
- **Schema version** - From `user_version` pragma (tracks migrations)
- **Last modified** - Timestamp from file stats
- **Record count** - Should always be 1 (singleton constraint)

**Rationale:**

- These metrics are readily available via better-sqlite3 pragmas and Node.js fs.statSync
- Provides transparency into the SQLite database state
- Helps with debugging (schema version useful for migration issues)
- Minimal performance overhead (all are O(1) operations)
- Aligns with common CLI tool patterns (showing system state)

**Implementation:**

```typescript
// Use PRAGMA for schema version
db.pragma('user_version', true); // Returns number

// Use fs.statSync for file metadata
const stats = fs.statSync(dbPath);
const sizeInBytes = stats.size;
const lastModified = stats.mtime;
```

**Sources:**

- [SQLite PRAGMA documentation](https://www.sqlite.org/pragma.html)
- [better-sqlite3 PRAGMA guide](https://dev.to/lovestaco/understanding-sqlite-pragma-and-how-better-sqlite3-makes-it-nicer-1ap0)

### 4. Section Filtering

**Decision:** **Defer to future iteration** (not in MVP)

**Rationale:**

- Settings object is small (4 top-level sections: models, user, environment, system)
- Full display is easily readable in terminal
- Adds implementation complexity (flag parsing, conditional rendering)
- No user feedback indicating this is needed
- Can be added later if user testing shows demand
- YAGNI principle - implement when actually needed

**Future consideration:** If added, use format `--section=models` or `--models-only`

### 5. Backup Strategy

**Decision:** **No automatic backups in MVP**

**Rationale:**

- `init` command already prompts for confirmation (unless `--force`)
- Settings are stored in `~/.shep/data` which users can manually backup
- Automatic backups add complexity:
  - Where to store backups? (`~/.shep/backups/`?)
  - Retention policy? (keep N backups?)
  - Naming convention? (timestamp-based?)
- Risk is low - settings can be re-initialized with sensible defaults
- Power users who need backups can use git or manual file copies

**Enhancement for confirmation prompt:** Mention backup in the warning message:

```
⚠ This will reset all settings to defaults. Consider backing up ~/.shep/data first.
```

### 6. Interactive Mode

**Decision:** **Defer to future iteration** (not in MVP)

**Rationale:**

- Default values are sensible (Claude Sonnet 4.5 for all agents, vscode, bash)
- Web UI and TUI provide better interfaces for customization
- Interactive prompts add significant complexity:
  - Multiple prompts (models, user, environment, system)
  - Input validation
  - Error handling
- First-run experience should be fast and frictionless
- Most users will use defaults or customize later via web/TUI

**Future consideration:** Could use Commander's `.option()` with interactive prompts (inquirer.js style)

### 7. Hierarchical Help System

**Decision:** Implement three-tier help hierarchy using Commander.js built-in help

**Rationale:**

- Commander.js automatically generates help text from command definitions
- Three-tier hierarchy provides progressive disclosure:
  - **Tier 1**: `shep --help` - Overview of all commands
  - **Tier 2**: `shep settings --help` - Settings subcommand group
  - **Tier 3**: `shep settings show --help` - Individual command details
- Follows industry-standard CLI patterns (git, docker, kubectl)
- User-friendly help improves discoverability and reduces documentation burden

**Implementation approach:**

```typescript
// Commander.js provides automatic help generation
const settings = new Command('settings')
  .description('Manage Shep global settings')
  .addCommand(createShowCommand())
  .addCommand(createInitCommand());

// Each subcommand defines detailed help
const show = new Command('show')
  .description('Display current settings')
  .option('-o, --output <format>', 'Output format: table|json|yaml', 'table')
  .addHelpText(
    'after',
    `
Examples:
  $ shep settings show              # Display as table (default)
  $ shep settings show --output json
  $ shep settings show -o yaml
  `
  );
```

**Help text guidelines:**

- Descriptions should be concise but complete (one sentence max)
- Include usage examples for each command
- Document all flags and options with clear explanations
- Use consistent formatting (Commander handles this automatically)
- Add "Examples:" section using `.addHelpText('after', ...)`

## Library Analysis

| Library        | Version | Purpose                   | Pros                                                            | Cons                              |
| -------------- | ------- | ------------------------- | --------------------------------------------------------------- | --------------------------------- |
| cli-table3     | ^0.6.5  | CLI table formatting      | Popular, TypeScript support, advanced features, color support   | Slightly larger bundle than table |
| js-yaml        | ^4.1.0  | YAML parsing/stringifying | Proven stability, fast reading, TypeScript support, widely used | Slower writing than alternatives  |
| @types/js-yaml | ^4.0.9  | TypeScript definitions    | Official type definitions                                       | Additional dev dependency         |

## Security Considerations

- **YAML parsing safety** - js-yaml's default `load()` is safe (doesn't execute code). Avoid `loadAll()` with untrusted input
- **File system access** - Database path validation to prevent path traversal (already handled by `getShepDbPath()` service)
- **Output sanitization** - Settings may contain sensitive data (email, GitHub username). Consider adding `--redact` flag in future
- **Command injection** - No user input is executed as shell commands, safe
- **Database permissions** - `~/.shep/` directory created with 0700 permissions (user-only access)

## Performance Implications

- **Table rendering** - cli-table3 is synchronous and fast for small datasets (settings object is tiny)
- **YAML serialization** - js-yaml reading is faster than `yaml` package, which is our primary use case
- **Database queries** - All queries are simple lookups on singleton record (O(1) with indexed id)
- **File size** - cli-table3 (~40KB minified) and js-yaml (~50KB minified) add ~90KB to bundle
- **Startup impact** - Loading these libraries on-demand (only when `settings` command is invoked) via dynamic imports could reduce CLI startup time if needed

**Optimization opportunities:**

- Lazy-load libraries: `const Table = (await import('cli-table3')).default;`
- Cache database metadata between invocations (not needed for MVP)

## Open Questions

All questions resolved.

**Decisions summary:**

- ✅ **Table library** - cli-table3 (most popular, best features)
- ✅ **YAML library** - js-yaml (proven, fast reading)
- ✅ **Database metrics** - path, size, schema version, last modified, record count
- ✅ **Section filtering** - Defer to future (not in MVP)
- ✅ **Backup strategy** - No automatic backups (manual prompt warning)
- ✅ **Interactive mode** - Defer to future (defaults are sensible)

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
