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

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
import { hasSettings, getSettings } from '../../../settings.service.js';

/**
 * Factory that creates the fast-implement node function.
 *
 * @param executor - The agent executor to use for implementation
 * @returns A LangGraph node function
 */
export function createFastImplementNode(executor: IAgentExecutor) {
  const log = createNodeLogger('fast-implement');

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.activate();
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

      // Validate that the executor actually produced file changes
      const cwd = state.worktreePath || state.repositoryPath;
      if (!hasWorktreeChanges(cwd)) {
        throw new Error(
          '[fast-implement] Agent produced no file changes — it may have entered plan mode or asked questions instead of implementing. Retrying.'
        );
      }

      // --- Evidence sub-agent: capture proof of completion (settings-gated) ---
      const evidenceEnabled = hasSettings() && getSettings().workflow.enableEvidence;
      const evidence = evidenceEnabled ? await collectEvidence(executor, state, log) : [];
      if (!evidenceEnabled) {
        log.info('Evidence collection disabled via settings — skipping');
      }

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
    const commitEvidence = hasSettings() && getSettings().workflow.commitEvidence;
    const prompt = buildEvidencePrompt(state, { commitEvidence });
    const options = buildExecutorOptions(state);
    const result = await retryExecute(executor, prompt, options, { logger: log });

    try {
      const evidence = parseEvidenceRecords(result.result);
      log.info(`Parsed ${evidence.length} evidence record(s)`);
      saveEvidenceManifest(state, evidence, log);
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

/**
 * Check whether the worktree has any uncommitted changes (new, modified, or deleted files).
 * Uses `git status --porcelain` which outputs one line per changed file, or empty if clean.
 * Returns false if the git command fails (e.g. not a git repo).
 */
function hasWorktreeChanges(cwd: string): boolean {
  try {
    const output = execSync('git status --porcelain', { cwd, encoding: 'utf-8' });
    return output.trim().length > 0;
  } catch {
    // If git command fails, assume no changes (conservative — will trigger the error)
    return false;
  }
}

/**
 * Save evidence manifest to the shep home evidence folder so the
 * merge review UI can read it without accessing graph state.
 */
function saveEvidenceManifest(
  state: FeatureAgentState,
  evidence: Evidence[],
  log: ReturnType<typeof createNodeLogger>
): void {
  if (evidence.length === 0) return;
  try {
    const cwd = state.worktreePath || state.repositoryPath;
    const repoHashDir = dirname(dirname(cwd));
    const evidenceDir = join(repoHashDir, 'evidence', state.featureId);
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(join(evidenceDir, 'manifest.json'), JSON.stringify(evidence, null, 2), 'utf-8');
    log.info(`Saved evidence manifest to ${evidenceDir}/manifest.json`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Failed to save evidence manifest: ${msg}`);
  }
}
