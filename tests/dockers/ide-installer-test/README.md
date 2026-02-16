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
3. Installs all auto-installable tools: vscode, windsurf, zed, cursor-cli, claude-code
4. Verifies installations with version commands
5. Shows installation instructions for manual-install tools: cursor (IDE), antigravity

**Result**: Passes if all automated installations complete successfully.
