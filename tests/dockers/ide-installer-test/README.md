# IDE Installer Test

Validates that the CLI builds successfully and can install all supported IDE/CLI tools.

## Run

From project root:

```bash
docker build -f tests/dockers/ide-installer-test/Dockerfile .
```

## What It Tests

1. Project builds with `pnpm install && pnpm build`
2. CLI links globally and is accessible
3. Installs all 7 supported tools: vscode, cursor, windsurf, zed, cursor-cli, claude-code, antigravity
4. Verifies installations with version commands

**Result**: Passes if all installation attempts complete (some tools may skip on headless environment, which is expected).
