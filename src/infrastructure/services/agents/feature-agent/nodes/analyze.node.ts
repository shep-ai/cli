import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureAgentState } from '../state.js';

/**
 * Analyze node — reads spec.yaml from the spec directory and
 * confirms it exists. For MVP this is a simple file read; future
 * iterations will delegate to IAgentExecutor.
 */
export async function analyzeNode(state: FeatureAgentState): Promise<Partial<FeatureAgentState>> {
  try {
    const specPath = join(state.specDir, 'spec.yaml');
    const specContent = readFileSync(specPath, 'utf-8');

    return {
      currentNode: 'analyze',
      messages: [`[analyze] Read spec.yaml (${specContent.length} bytes) from ${state.specDir}`],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      currentNode: 'analyze',
      error: message,
      messages: [`[analyze] Error reading spec.yaml: ${message}`],
    };
  }
}
