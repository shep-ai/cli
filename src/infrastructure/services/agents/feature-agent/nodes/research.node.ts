import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureAgentState } from '../state.js';

/**
 * Research node — checks whether research.yaml exists in the spec directory.
 */
export async function researchNode(state: FeatureAgentState): Promise<Partial<FeatureAgentState>> {
  try {
    const researchPath = join(state.specDir, 'research.yaml');
    let researchExists = false;
    try {
      readFileSync(researchPath, 'utf-8');
      researchExists = true;
    } catch {
      /* file may not exist yet */
    }

    return {
      currentNode: 'research',
      messages: [`[research] Research artifact ${researchExists ? 'exists' : 'needs creation'}`],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      currentNode: 'research',
      error: message,
      messages: [`[research] Error: ${message}`],
    };
  }
}
