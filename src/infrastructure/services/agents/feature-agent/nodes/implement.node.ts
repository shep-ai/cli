import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureAgentState } from '../state.js';

/**
 * Implement node — checks whether tasks.yaml exists in the spec directory.
 */
export async function implementNode(state: FeatureAgentState): Promise<Partial<FeatureAgentState>> {
  try {
    const tasksPath = join(state.specDir, 'tasks.yaml');
    let tasksExists = false;
    try {
      readFileSync(tasksPath, 'utf-8');
      tasksExists = true;
    } catch {
      /* file may not exist yet */
    }

    return {
      currentNode: 'implement',
      messages: [
        `[implement] Tasks artifact ${tasksExists ? 'exists, ready for execution' : 'needs creation'}`,
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      currentNode: 'implement',
      error: message,
      messages: [`[implement] Error: ${message}`],
    };
  }
}
