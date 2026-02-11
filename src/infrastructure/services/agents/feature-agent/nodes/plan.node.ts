import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureAgentState } from '../state.js';

/**
 * Plan node — checks whether plan.yaml exists in the spec directory.
 */
export async function planNode(state: FeatureAgentState): Promise<Partial<FeatureAgentState>> {
  try {
    const planPath = join(state.specDir, 'plan.yaml');
    let planExists = false;
    try {
      readFileSync(planPath, 'utf-8');
      planExists = true;
    } catch {
      /* file may not exist yet */
    }

    return {
      currentNode: 'plan',
      messages: [`[plan] Plan artifact ${planExists ? 'exists' : 'needs creation'}`],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      currentNode: 'plan',
      error: message,
      messages: [`[plan] Error: ${message}`],
    };
  }
}
