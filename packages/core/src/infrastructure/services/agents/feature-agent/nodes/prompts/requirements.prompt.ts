/**
 * Requirements Phase Prompt
 *
 * Instructs the agent to build comprehensive requirements from the analysis,
 * including product questions with AI-recommended default answers.
 * Writes back to spec.yaml with full requirements.
 */

import { readSpecFile } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';

export function buildRequirementsPrompt(state: FeatureAgentState): string {
  const specContent = readSpecFile(state.specDir, 'spec.yaml');

  return `You are a product analyst performing the REQUIREMENTS phase of feature development.

## Your Task

1. Read the current spec with codebase analysis below
2. Build a complete set of functional and non-functional requirements
3. Define clear, measurable success criteria
4. Identify product decisions that need input — for EACH one, provide your AI-recommended default answer with rationale
5. Update the spec YAML file with the full requirements

## Current Spec (with analysis)

${specContent}

## What to Produce

### Requirements
- **Functional requirements (FR-N)**: what the system must DO
- **Non-functional requirements (NFR-N)**: performance, security, UX, maintainability constraints
- **Success criteria**: measurable checkboxes that define "done"

### Product Questions with AI Defaults
For every ambiguous product decision, create an openQuestion entry with:
- A clear question
- resolved: true (your recommendation is the default)
- Your recommended answer with reasoning

The user can later review and override these defaults. This is the AI-recommended path — not the only option.

## Output Instructions

Update the file at: ${state.specDir}/spec.yaml

Write the COMPLETE file. Preserve name/number/branch/technologies from analysis and update:

  name: (keep)
  number: (keep)
  branch: (keep)
  oneLiner: (keep or refine)
  summary: >
    (keep or refine based on requirements)
  phase: Requirements
  sizeEstimate: (keep or update if scope changed)

  relatedFeatures: (keep)

  technologies:
    - (keep from analysis, add any new ones identified)

  relatedLinks: (keep)

  openQuestions:
    - question: 'Should X use approach A, B, or C?'
      resolved: true
      options:
        - option: Approach A
          description: (What approach A means and its trade-offs)
          selected: true
        - option: Approach B
          description: (What approach B means and its trade-offs)
          selected: false
        - option: Approach C
          description: (What approach C means and its trade-offs)
          selected: false
      selectionRationale: >
        (Detailed reasoning for why approach A is recommended.
        Reference codebase patterns where relevant.)
    - question: 'What level of Y is needed?'
      resolved: true
      options:
        - option: Level X
          description: (What level X means and its trade-offs)
          selected: true
        - option: Level Y
          description: (What level Y means and its trade-offs)
          selected: false
        - option: Level Z
          description: (What level Z means and its trade-offs)
          selected: false
      selectionRationale: >
        (Detailed reasoning for why level X is recommended.)

  content: |
    ## Problem Statement

    (refined from analysis)

    ## Success Criteria

    - [ ] (measurable criterion 1)
    - [ ] (measurable criterion 2)
    - [ ] (etc.)

    ## Functional Requirements

    - **FR-1**: (requirement description)
    - **FR-2**: (requirement description)

    ## Non-Functional Requirements

    - **NFR-1**: (performance/security/UX requirement)
    - **NFR-2**: (etc.)

    ## Product Questions & AI Recommendations

    | # | Question | AI Recommendation | Rationale |
    | - | -------- | ----------------- | --------- |
    | 1 | (question) | (recommended answer) | (why) |

    ## Affected Areas

    (keep from analysis)

    ## Dependencies

    (keep from analysis, add any new ones)

    ## Size Estimate

    (keep or update with requirements-informed reasoning)

## Constraints

- Write ONLY to ${state.specDir}/spec.yaml
- Every open question MUST have an AI-recommended default answer (resolved: true)
- Every open question MUST have exactly 3 options to choose from
- Requirements must be specific and testable, not vague
- Do NOT create any other files
- Do NOT modify any source code`;
}
