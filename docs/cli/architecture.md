# CLI Architecture

## Bootstrap Sequence

Entry point: `src/presentation/cli/index.ts`

The `bootstrap()` function runs three sequential steps:

1. **Initialize DI container** -- `initializeContainer()` opens SQLite, runs migrations, registers repositories and use cases.
2. **Initialize settings** -- Resolves `InitializeSettingsUseCase` from the container, executes it to load/create settings, then calls `initializeSettings(settings)` to populate the in-memory singleton.
3. **Configure Commander** -- Creates the root `Command('shep')`, registers subcommands, calls `program.parseAsync()`.

```typescript
async function bootstrap() {
  await initializeContainer();
  const useCase = container.resolve(InitializeSettingsUseCase);
  const settings = await useCase.execute();
  initializeSettings(settings);

  const program = new Command()
    .name('shep')
    .version(version, '-v, --version')
    .action(() => program.outputHelp());

  program.addCommand(createVersionCommand());
  program.addCommand(createSettingsCommand());
  await program.parseAsync();
}
```

`reflect-metadata` is imported at the very top of the file (before any other imports) as required by tsyringe.

## Command Structure Pattern

Every command is a factory function returning a `Command` instance:

```typescript
export function createXxxCommand(): Command {
  return new Command('name')
    .description('...')
    .addOption(...)
    .addHelpText('after', '...')
    .action((options) => { ... });
}
```

### Conventions

- **Factory function**: Named `create<Name>Command()`, exported from `<name>.command.ts`.
- **Command groups**: A parent command file (`index.ts`) adds child commands via `.addCommand()`. See `commands/settings/index.ts`.
- **Options**: Use `new Option(...)` with `.choices()` for enum-like values, `.default()` for defaults.
- **Help text**: Append examples via `.addHelpText('after', ...)` with leading `$` for command examples.
- **Async commands**: Use `async` action handlers; Commander calls `parseAsync()` to support them.

### File Organization

```
commands/
  version.command.ts            # Top-level command
  settings/
    index.ts                    # createSettingsCommand() - group
    show.command.ts             # createShowCommand() - subcommand
    init.command.ts             # createInitCommand() - subcommand
```

To add a new command group:

1. Create `commands/<group>/index.ts` with `createGroupCommand()`.
2. Add subcommand files as `<action>.command.ts`.
3. Register via `program.addCommand(createGroupCommand())` in `index.ts`.

## DI Integration

Commands access application services through two mechanisms:

### Container resolution (for use cases)

```typescript
import { container } from '@/infrastructure/di/container';
const useCase = container.resolve(SomeUseCase);
await useCase.execute();
```

Used during bootstrap for `InitializeSettingsUseCase`.

### Settings singleton (for configuration)

```typescript
import { getSettings } from '@/infrastructure/services/settings.service';
const settings = getSettings(); // Returns Settings object
```

The `getSettings()` singleton is the preferred way to access settings in command handlers. It avoids re-resolving from the DI container on every call. The singleton is set once during bootstrap and is read-only thereafter. The `settings init` command uses `resetSettings()` + `initializeSettings()` to replace the singleton in-place.

## Error Handling

### Command-level errors

Each command action wraps its body in `try/catch`. On error:

- Call `messages.error(message, error)` to display the error.
- Set `process.exitCode = 1` (do not call `process.exit()` from command handlers).

```typescript
.action((options) => {
  try {
    // command logic
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    messages.error('Failed to do X', err);
    process.exitCode = 1;
  }
});
```

### Bootstrap-level errors

Bootstrap wraps the entire sequence in `try/catch`. Each step has its own inner `try/catch` that logs the specific error with `messages.error()`, then re-throws. The outer catch calls `process.exit(1)`.

### Global handlers

Registered at module level for safety:

- `process.on('uncaughtException', ...)` -- logs and exits.
- `process.on('unhandledRejection', ...)` -- logs and exits.

### Debug output

Error stack traces are only printed when the `DEBUG` environment variable is set. This applies to `messages.error()` and `messages.debug()`.

## Help Text Conventions

- Root command shows help by default (no arguments).
- `--version` / `-v` prints version number only.
- `version` subcommand prints detailed info (name, description, Node version, platform).
- Command groups show their subcommand list when invoked without a subcommand.
- Examples in `addHelpText('after', ...)` use `$ shep <command>` prefix format.
