/**
 * Fast-Implement Node
 *
 * Single-pass implementation node for fast mode. Builds a prompt from
 * the user's query plus lightweight codebase context, calls the executor
 * once, and returns. Does NOT handle commit/push/PR — that's the merge
 * node's job.
 *
 * Follows the same factory pattern as other nodes: takes executor
 * dependency, returns async (state) => Partial<FeatureAgentState>.
 */

import { isGraphBubbleUp } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { Evidence } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';
import { createNodeLogger, buildExecutorOptions, retryExecute } from './node-helpers.js';
import { reportNodeStart } from '../heartbeat.js';
import { recordPhaseStart, recordPhaseEnd } from '../phase-timing-context.js';
import { updateNodeLifecycle } from '../lifecycle-context.js';
import { buildFastImplementPrompt } from './prompts/fast-implement.prompt.js';
import { buildEvidencePrompt } from './prompts/evidence-prompts.js';
import { parseEvidenceRecords } from './evidence-output-parser.js';

/**
 * Factory that creates the fast-implement node function.
 *
 * @param executor - The agent executor to use for implementation
 * @returns A LangGraph node function
 */
export function createFastImplementNode(executor: IAgentExecutor) {
  const log = createNodeLogger('fast-implement');

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.info('Starting fast implementation');
    reportNodeStart('fast-implement');
    await updateNodeLifecycle('fast-implement');

    const startTime = Date.now();
    const timingId = await recordPhaseStart('fast-implement');

    try {
      const prompt = buildFastImplementPrompt(state);
      const options = buildExecutorOptions(state);

      log.info(`Executing agent at cwd=${options.cwd}`);
      log.info(`Prompt length: ${prompt.length} chars`);
      const result = await retryExecute(executor, prompt, options, { logger: log });
      const durationMs = Date.now() - startTime;
      const elapsed = (durationMs / 1000).toFixed(1);
      log.info(`Complete (${result.result.length} chars, ${elapsed}s)`);

      // --- Evidence sub-agent: capture proof of completion ---
      const evidence = await collectEvidence(executor, state, log);

      await recordPhaseEnd(timingId, durationMs);

      return {
        currentNode: 'fast-implement',
        evidence,
        messages: [
          `[fast-implement] Complete (${result.result.length} chars, ${elapsed}s)`,
          `[fast-implement] Evidence: ${evidence.length} record(s) captured`,
        ],
        _needsReexecution: false,
      };
    } catch (err: unknown) {
      if (isGraphBubbleUp(err)) throw err;

      const message = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startTime;
      const elapsed = (durationMs / 1000).toFixed(1);
      log.error(`${message} (after ${elapsed}s)`);

      await recordPhaseEnd(timingId, durationMs);

      // Throw so LangGraph does NOT checkpoint this node as "completed".
      throw new Error(`[fast-implement] ${message}`);
    }
  };
}

/**
 * Sub-agent call to collect evidence after fast implementation completes.
 * Graceful degradation: returns empty array on any failure so evidence
 * collection never blocks the workflow.
 */
async function collectEvidence(
  executor: IAgentExecutor,
  state: FeatureAgentState,
  log: ReturnType<typeof createNodeLogger>
): Promise<Evidence[]> {
  try {
    log.info('Collecting evidence (sub-agent)');
    const prompt = buildEvidencePrompt(state);
    const options = buildExecutorOptions(state);
    const result = await retryExecute(executor, prompt, options, { logger: log });

    try {
      const evidence = parseEvidenceRecords(result.result);
      log.info(`Parsed ${evidence.length} evidence record(s)`);
      return evidence;
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      log.error(`Warning: evidence parsing failed: ${msg} — continuing with empty evidence`);
      return [];
    }
  } catch (err) {
    // Re-throw LangGraph control-flow exceptions
    if (isGraphBubbleUp(err)) throw err;

    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Evidence collection failed: ${msg} — continuing without evidence`);
    return [];
  }
}
