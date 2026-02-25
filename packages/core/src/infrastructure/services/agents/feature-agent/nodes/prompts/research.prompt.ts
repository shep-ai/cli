/**
 * Research Phase Prompt
 *
 * Instructs the agent to research technical implementation details,
 * evaluate libraries, and document architecture decisions with rationale.
 * Writes to research.yaml.
 */

import { readSpecFile } from '../node-helpers.js';
import type { FeatureAgentState } from '../../state.js';

export function buildResearchPrompt(state: FeatureAgentState): string {
  const specContent = readSpecFile(state.specDir, 'spec.yaml');
  const existingResearch = readSpecFile(state.specDir, 'research.yaml');

  return `You are a technical architect performing the RESEARCH phase of feature development.

## Your Task

1. Read the feature spec with requirements below
2. Research how to implement this feature technically
3. For each technical decision, evaluate multiple options and choose one with clear rationale
4. Evaluate libraries needed — document what to use, what to reject, and why
5. Identify security and performance implications
6. Write your complete research to the research YAML file

## Feature Spec (with requirements)

${specContent}

${existingResearch ? `## Existing Research (update/expand this)\n\n${existingResearch}` : ''}

## What to Research

- **Architecture decisions**: how this fits into the existing codebase architecture
- **Technology choices**: which libraries/tools/patterns to use (and which to reject)
- **Data model changes**: any schema or model updates needed
- **API design**: endpoints, contracts, interfaces
- **Security implications**: authentication, authorization, data safety
- **Performance considerations**: caching, optimization, scalability
- **Integration points**: how this connects to existing systems

## Output Instructions

Write your research to: ${state.specDir}/research.yaml

Use this YAML structure:

  name: (feature name from spec)
  summary: >
    (2-3 sentence summary of research findings and key decisions)

  relatedFeatures: []

  technologies:
    - (list all technologies evaluated or needed)

  relatedLinks:
    - (relevant documentation URLs discovered during research)

  decisions:
    - title: '(Decision Title — e.g., "Database Schema Design")'
      chosen: '(The chosen approach)'
      rejected:
        - '(Alternative 1 that was considered and why not)'
        - '(Alternative 2 that was considered and why not)'
      rationale: >
        (Detailed reasoning for why the chosen approach is best.
        Reference the codebase's existing patterns where relevant.)

    - title: '(Next Decision)'
      chosen: '...'
      rejected:
        - '...'
      rationale: >
        ...

  openQuestions:
    - question: '(Any technical question that arose)'
      resolved: true
      options:
        - option: (Option A)
          description: (What option A means and its trade-offs)
          selected: true
        - option: (Option B)
          description: (What option B means and its trade-offs)
          selected: false
        - option: (Option C)
          description: (What option C means and its trade-offs)
          selected: false
      selectionRationale: >
        (Detailed reasoning for why this option was selected.
        Reference codebase patterns and technical constraints.)

  content: |
    ## Technology Decisions

    ### 1. (Decision Title)

    **Chosen:** (approach)

    **Rejected:**
    - (alternative 1) — (why rejected)
    - (alternative 2) — (why rejected)

    **Rationale:** (detailed reasoning)

    ### 2. (Next Decision)
    ...

    ## Library Analysis

    | Library | Purpose | Decision | Reasoning |
    | ------- | ------- | -------- | --------- |
    | (lib)   | (purpose) | Use/Reject | (why) |

    ## Security Considerations

    (security implications and mitigations)

    ## Performance Implications

    (performance considerations and optimizations)

    ## Architecture Notes

    (how this fits into the existing codebase architecture)

## Constraints

- Write ONLY to ${state.specDir}/research.yaml
- Every decision MUST have at least one rejected alternative with reasoning
- Every decision MUST have clear rationale referencing the codebase where applicable
- Every open question MUST have exactly 3 options to choose from
- Prefer solutions that follow existing codebase patterns and conventions
- Do NOT create any other files
- Do NOT modify any source code`;
}
