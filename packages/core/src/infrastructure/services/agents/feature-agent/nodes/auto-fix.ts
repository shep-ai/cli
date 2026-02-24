/**
 * Node-level auto-fix wrapper.
 *
 * Catches errors from graph node functions, classifies them,
 * and if fixable, prompts the AI executor to diagnose and fix
 * the issue before retrying the node.
 */

import { isGraphBubbleUp } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { NodeFixRecord } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';
import { createNodeLogger, buildExecutorOptions } from './node-helpers.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';

/* ------------------------------------------------------------------ */
/*  Error classification                                               */
/* ------------------------------------------------------------------ */

export type NodeErrorCategory = 'fixable' | 'non-fixable';

const NON_FIXABLE_PATTERNS = [
  /GraphBubbleUp/,
  /AUTH_FAILURE/,
  /EACCES/,
  /ENOENT/,
  /Process exited with code/,
];

/**
 * Classify a node error as fixable or non-fixable.
 *
 * Non-fixable errors bypass the fix loop entirely:
 * - LangGraph control-flow (GraphBubbleUp)
 * - Auth failures (AUTH_FAILURE, EACCES)
 * - Missing binaries (ENOENT)
 * - Process crashes (Process exited with code)
 */
export function classifyNodeError(errorMessage: string): NodeErrorCategory {
  for (const pattern of NON_FIXABLE_PATTERNS) {
    if (pattern.test(errorMessage)) return 'non-fixable';
  }
  return 'fixable';
}

/* ------------------------------------------------------------------ */
/*  Fix prompt builder                                                 */
/* ------------------------------------------------------------------ */

const NODE_CONTEXT: Record<string, string> = {
  analyze: 'analyzing the repository structure and existing codebase',
  requirements: 'generating product requirements from the spec',
  research: 'researching technical approaches and libraries',
  plan: 'creating the implementation plan and task breakdown',
  implement: 'implementing code changes for a task phase',
};

/**
 * Build a diagnostic/fix prompt for the AI executor.
 */
export function buildNodeFixPrompt(
  nodeName: string,
  errorMessage: string,
  state: FeatureAgentState
): string {
  const cwd = state.worktreePath || state.repositoryPath;
  const context = NODE_CONTEXT[nodeName] ?? `executing the "${nodeName}" step`;

  return [
    `## Auto-Fix: Node "${nodeName}" Failed`,
    '',
    `The previous step was ${context} and it failed with the following error:`,
    '',
    '```',
    errorMessage,
    '```',
    '',
    `Working directory: ${cwd}`,
    `Spec directory: ${state.specDir}`,
    '',
    '## Instructions',
    '',
    'Diagnose the root cause and fix the issue in the working directory.',
    'You have full access to read files, run commands, and make changes.',
    '',
    'If you determine the issue is NOT fixable (e.g., requires external action,',
    'credential changes, or infrastructure changes), respond with:',
    'UNFIXABLE: <brief explanation of why this cannot be fixed>',
    '',
    'Otherwise, fix the issue and confirm what you changed.',
  ].join('\n');
}

/* ------------------------------------------------------------------ */
/*  withAutoFix higher-order wrapper                                   */
/* ------------------------------------------------------------------ */

export interface AutoFixOptions {
  /** Maximum number of fix attempts (default: 2). */
  maxAttempts?: number;
}

type NodeFn = (state: FeatureAgentState) => Promise<Partial<FeatureAgentState>>;

/**
 * Wrap a node function with auto-fix logic.
 *
 * On error:
 * 1. Check if it's a LangGraph control-flow error → always rethrow
 * 2. Classify the error → if non-fixable, rethrow immediately
 * 3. If fixable, call executor with diagnostic prompt
 * 4. If executor says UNFIXABLE, rethrow original error
 * 5. Otherwise, retry the node function
 * 6. Repeat up to maxAttempts times
 */
export function withAutoFix(
  nodeName: string,
  innerFn: NodeFn,
  executor: IAgentExecutor,
  opts?: AutoFixOptions
): NodeFn {
  const log = createNodeLogger(`${nodeName}:auto-fix`);

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    // Read maxAttempts lazily: explicit option > settings > default 2
    let maxAttempts = opts?.maxAttempts;
    if (maxAttempts == null) {
      try {
        maxAttempts = getSettings().workflow?.nodeFixMaxAttempts ?? 2;
      } catch {
        maxAttempts = 2;
      }
    }
    const fixHistory: NodeFixRecord[] = [];
    let lastError: Error | undefined;

    // Initial attempt
    try {
      return await innerFn(state);
    } catch (err: unknown) {
      if (isGraphBubbleUp(err)) throw err;

      lastError = err instanceof Error ? err : new Error(String(err));
      const category = classifyNodeError(lastError.message);

      if (category === 'non-fixable') {
        log.info(`Non-fixable error: ${lastError.message.slice(0, 200)}`);
        throw lastError;
      }
    }

    // Fix loop
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startedAt = new Date().toISOString();
      log.info(
        `Fix attempt ${attempt}/${maxAttempts} for error: ${lastError!.message.slice(0, 200)}`
      );

      // Call executor with fix prompt
      const fixPrompt = buildNodeFixPrompt(nodeName, lastError!.message, state);
      const options = buildExecutorOptions(state);
      const fixResult = await executor.execute(fixPrompt, options);

      // Check for UNFIXABLE response
      if (fixResult.result.trimStart().startsWith('UNFIXABLE')) {
        log.info(`Executor reported UNFIXABLE: ${fixResult.result.slice(0, 200)}`);
        fixHistory.push({
          attempt,
          nodeName,
          errorSummary: lastError!.message.slice(0, 500),
          startedAt,
          outcome: 'unfixable',
        });
        // Attach fix history to the error for observability, then rethrow
        throw lastError!;
      }

      // Retry the node
      try {
        const result = await innerFn(state);

        fixHistory.push({
          attempt,
          nodeName,
          errorSummary: lastError!.message.slice(0, 500),
          startedAt,
          outcome: 'fixed',
        });

        log.info(`Fix succeeded on attempt ${attempt}`);

        // Merge fix tracking into result
        return {
          ...result,
          nodeFixAttempts: attempt,
          nodeFixHistory: fixHistory,
          nodeFixStatus: 'success' as const,
        };
      } catch (retryErr: unknown) {
        if (isGraphBubbleUp(retryErr)) throw retryErr;

        lastError = retryErr instanceof Error ? retryErr : new Error(String(retryErr));

        fixHistory.push({
          attempt,
          nodeName,
          errorSummary: lastError.message.slice(0, 500),
          startedAt,
          outcome: 'failed',
        });

        log.info(`Retry failed on attempt ${attempt}: ${lastError.message.slice(0, 200)}`);
      }
    }

    // All attempts exhausted
    log.info(`All ${maxAttempts} fix attempts exhausted`);
    throw lastError!;
  };
}
