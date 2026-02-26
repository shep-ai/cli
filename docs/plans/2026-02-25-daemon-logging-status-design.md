# Daemon Logging & Enhanced Status

## Summary

Redirect daemon stdout/stderr to `~/.shep/daemon.log` via spawn stdio fd. Enhance `shep status` with environment info, agent versions, and `--logs`/`--follow` flags.

## Daemon Logging

- Open `~/.shep/daemon.log` as writable fd before spawning child process
- Pass as stdout+stderr: `stdio: ['ignore', logFd, logFd]`
- On start, rotate existing log to `daemon.log.old` (keep 1 backup)
- All console output from daemon child lands in the file automatically

## `shep status --logs`

- `--logs [N]` — show last N lines (default 50)
- `--follow` / `-f` — tail -f live follow
- Combinable: `--logs 100 --follow`

## Enhanced Status Output

Add two new sections:

**Environment:** Shep Home, Project Dir, CLI Version, Node Version, DB Path, Log File path, Daemon Config path.

**Agent Executors:** Detect installed agent CLIs at runtime (`claude --version`, `gemini --version`). Show version or "not installed".

## Files to Change

1. `src/presentation/cli/commands/daemon/start-daemon.ts` — log fd, rotation, spawn stdio
2. `src/presentation/cli/commands/status.command.ts` — --logs, --follow, env section, agent versions
3. `packages/core/src/infrastructure/services/filesystem/shep-directory.service.ts` — `getDaemonLogPath()`
4. Directory service interface if needed
