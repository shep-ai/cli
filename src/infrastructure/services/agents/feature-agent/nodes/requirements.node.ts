import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureAgentState } from '../state.js';

/**
 * Requirements node — reads spec.yaml and summarises requirements.
 *
 * Checks whether success-criteria are present in the spec so downstream
 * nodes know whether to generate them.
 */
export async function requirementsNode(
  state: FeatureAgentState
): Promise<Partial<FeatureAgentState>> {
  try {
    const specPath = join(state.specDir, 'spec.yaml');
    const specContent = readFileSync(specPath, 'utf-8');

    const hasSuccessCriteria =
      specContent.includes('Success Criteria') || specContent.includes('success_criteria');

    return {
      currentNode: 'requirements',
      messages: [
        `[requirements] Analyzed spec (${specContent.length} bytes), success criteria ${hasSuccessCriteria ? 'found' : 'not found'}`,
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      currentNode: 'requirements',
      error: message,
      messages: [`[requirements] Error: ${message}`],
    };
  }
}
