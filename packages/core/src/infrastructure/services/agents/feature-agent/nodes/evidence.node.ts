/**
 * Evidence Node — Agent-Directed Evidence Collection
 *
 * Captures visual and textual evidence (screenshots, test outputs,
 * terminal recordings) proving that implemented tasks work as expected.
 * Evidence files are committed to .shep/evidence/ on the feature branch
 * and evidence records flow through graph state to the merge node for
 * inclusion in the PR body.
 *
 * Uses a custom node pattern (not executeNode) because it needs a
 * post-execution parsing step to extract Evidence[] from the agent's
 * text output via parseEvidenceRecords. Reuses the same helpers as
 * other nodes (createNodeLogger, buildExecutorOptions, retryExecute,
 * getCompletedPhases, markPhaseComplete).
 *
 * Graceful degradation (FR-8): parse failures return empty evidence
 * array and log a warning. Evidence failures never block the merge.
 */

import { isGraphBubbleUp } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { Evidence } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';
import {
  createNodeLogger,
  getCompletedPhases,
  markPhaseComplete,
  retryExecute,
  buildExecutorOptions,
} from './node-helpers.js';
import { reportNodeStart } from '../heartbeat.js';
import { recordPhaseStart, recordPhaseEnd } from '../phase-timing-context.js';
import { updateNodeLifecycle } from '../lifecycle-context.js';
import { buildEvidencePrompt } from './prompts/evidence-prompts.js';
import { parseEvidenceRecords, validateUiEvidenceHasAppProof } from './evidence-output-parser.js';
import { hasSettings, getSettings } from '../../../settings.service.js';

/**
 * Factory that creates the evidence collection node function.
 *
 * @param executor - Agent executor for running the evidence capture prompt
 * @returns A LangGraph node function
 */
export function createEvidenceNode(executor: IAgentExecutor) {
  const log = createNodeLogger('evidence');

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.activate();
    log.info('Starting evidence collection');
    reportNodeStart('evidence');
    await updateNodeLifecycle('evidence');

    // --- Resume support: skip if already completed ---
    const completedPhases = getCompletedPhases(state.specDir);
    if (completedPhases.includes('evidence')) {
      log.info('Evidence phase already completed, skipping execution');
      return {
        currentNode: 'evidence',
        messages: ['[evidence] Already completed — skipping'],
        _needsReexecution: false,
      };
    }

    const startTime = Date.now();
    const timingId = await recordPhaseStart('evidence');

    try {
      const commitEvidence = hasSettings() && getSettings().workflow.commitEvidence;
      const prompt = buildEvidencePrompt(state, { commitEvidence });
      const options = buildExecutorOptions(state);

      log.info(`Executing agent at cwd=${options.cwd}`);
      log.info(`Prompt length: ${prompt.length} chars`);
      const result = await retryExecute(executor, prompt, options, { logger: log });
      const durationMs = Date.now() - startTime;
      const elapsed = (durationMs / 1000).toFixed(1);
      log.info(`Agent complete (${result.result.length} chars, ${elapsed}s)`);

      // --- Parse evidence records from agent output (graceful degradation) ---
      let evidence: Evidence[];
      try {
        evidence = parseEvidenceRecords(result.result);
        log.info(`Parsed ${evidence.length} evidence record(s)`);
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        log.error(`Warning: evidence parsing failed: ${msg} — continuing with empty evidence`);
        evidence = [];
      }

      // --- Validate UI evidence includes app-level proof ---
      const validationResult = validateUiEvidenceHasAppProof(evidence);
      const validationMessages: string[] = [];
      if (validationResult.warnings.length > 0) {
        for (const warning of validationResult.warnings) {
          log.error(`Evidence validation: ${warning}`);
          validationMessages.push(`[evidence] Warning: ${warning}`);
        }
      }

      await recordPhaseEnd(timingId, durationMs);
      markPhaseComplete(state.specDir, 'evidence', log);

      return {
        currentNode: 'evidence',
        evidence,
        messages: [
          `[evidence] Complete — ${evidence.length} evidence record(s) captured (${elapsed}s)`,
          ...(evidence.length === 0
            ? ['[evidence] Warning: no evidence records parsed from agent output']
            : []),
          ...validationMessages,
        ],
        _needsReexecution: false,
      };
    } catch (err: unknown) {
      // Re-throw LangGraph control-flow exceptions (interrupt, Command, etc.)
      if (isGraphBubbleUp(err)) throw err;

      const message = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startTime;
      const elapsed = (durationMs / 1000).toFixed(1);
      log.error(`Evidence collection failed: ${message} (${elapsed}s)`);

      await recordPhaseEnd(timingId, durationMs);

      throw new Error(`[evidence] ${message}`);
    }
  };
}
