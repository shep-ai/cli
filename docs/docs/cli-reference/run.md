---
id: run
title: shep run
---

# `shep run`

Run a specific agent task or pipeline step directly. Useful for re-running failed steps or running individual phases of the pipeline.

## Synopsis

```bash
shep run <task> [options]
```

## Usage

```bash
# Run a feature's full pipeline
shep run feature 001

# Run only the implementation phase
shep run feature 001 --phase implement

# Run with a specific agent
shep run agent code-reviewer --feature 001
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--phase <phase>` | Run only a specific pipeline phase | All phases |
| `--from <phase>` | Resume from a specific phase | — |
| `--dry-run` | Preview without executing | `false` |
| `--verbose` | Show detailed output | `false` |
| `--repo <path>` | Target repository | Current directory |

## Pipeline Phases

| Phase | Description |
|-------|-------------|
| `research` | Code exploration and context gathering |
| `plan` | Architecture and implementation planning |
| `implement` | Code writing and test execution |
| `review` | Code review and quality checks |
| `commit` | Git commit and branch operations |

## Examples

```bash
# Re-run a failed feature from the implementation phase
shep run feature 003 --from implement

# Run only the review phase for a feature
shep run feature 003 --phase review

# Dry-run to see what would happen
shep run feature 003 --dry-run --verbose
```
