---
id: version
title: shep version
---

# `shep version`

Print the currently installed version of Shep.

## Synopsis

```bash
shep version [options]
```

## Options

| Option | Description |
|--------|-------------|
| `--json` | Output version info as JSON |

## Examples

```bash
# Print version
shep version

# JSON output
shep version --json
```

## Example Output

```
shep v1.2.3
```

With `--json`:

```json
{
  "version": "1.2.3",
  "node": "22.0.0",
  "platform": "linux"
}
```

## Checking for Updates

To check if a newer version is available and upgrade:

```bash
shep upgrade
```
