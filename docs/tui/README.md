# TUI Documentation

Reference documentation for the Shep AI TUI (Terminal UI) presentation layer.

## Overview

The TUI layer provides interactive terminal wizards using [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js). Wizards are invoked from CLI commands when multi-step interactive input is needed (e.g., agent configuration, onboarding, plan/PRD review flows).

The TUI is not a standalone presentation layer but integrates with CLI commands -- a command determines when a wizard is needed and delegates to the TUI layer for interactive prompts.

## Documents

| Document                               | Description                                             |
| -------------------------------------- | ------------------------------------------------------- |
| [architecture.md](./architecture.md)   | Wizard structure, prompt patterns, integration with CLI |
| [design-system.md](./design-system.md) | Prompt styling, themes, consistent UX patterns          |

## Quick Reference

### File Layout

```
src/presentation/tui/
  index.ts                          # Barrel export
  wizards/
    agent-config.wizard.ts          # Agent selection + auth wizard
    merge-review.wizard.ts          # Merge/PR review flow
    plan-review.wizard.ts           # Plan review flow
    prd-review.wizard.ts            # PRD review flow
    onboarding/
      onboarding.wizard.ts          # First-run onboarding wizard
      types.ts                      # Onboarding types
      steps/
        agent.step.ts               # Agent configuration step
        ide.step.ts                 # IDE selection step
        workflow-defaults.step.ts   # Workflow defaults step
  prompts/
    agent-select.prompt.ts          # Agent selection prompt config
    auth-method.prompt.ts           # Auth method selection
    ide-select.prompt.ts            # IDE selection prompt config
    prd-review-question.prompt.ts   # PRD review question prompt
    prd-review-summary.prompt.ts    # PRD review summary prompt
  themes/
    shep.theme.ts                   # Custom Inquirer theme (colors, symbols)
```

### Available Wizards

| Wizard                | Invoked By                           | Description                        |
| --------------------- | ------------------------------------ | ---------------------------------- |
| `onboardingWizard()`  | First-run gate in bootstrap          | Full setup: agent + IDE + workflow |
| `agentConfigWizard()` | `shep settings agent`                | Select AI agent + configure auth   |
| `mergeReviewWizard()` | `shep feat review`                   | Merge/PR review flow               |
| `planReviewWizard()`  | Plan review during feature lifecycle | Plan review flow                   |
| `prdReviewWizard()`   | PRD review during feature lifecycle  | PRD review flow                    |

### Prompt Types Used

| Prompt     | Package              | Purpose                                                        |
| ---------- | -------------------- | -------------------------------------------------------------- |
| `select`   | `@inquirer/select`   | Single-choice selection with descriptions and disabled options |
| `confirm`  | `@inquirer/confirm`  | Yes/no confirmation                                            |
| `password` | `@inquirer/password` | Masked sensitive input (API tokens)                            |
| `input`    | `@inquirer/input`    | Free-form text input                                           |
