/**
 * Shared foundation for feature-agent graph nodes.
 *
 * Provides consistent logging, spec file reading, executor invocation,
 * and error handling so every node follows the same patterns.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
} from '@/application/ports/output/agent-executor.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';
import { reportNodeStart } from '../heartbeat.js';

/**
 * Create a scoped logger that prefixes messages with the node name.
 * Output goes to stdout which the worker redirects to the log file.
 */
export function createNodeLogger(nodeName: string) {
  return {
    info(message: string): void {
      const ts = new Date().toISOString();
      process.stdout.write(`[${ts}] [${nodeName}] ${message}\n`);
    },
    error(message: string): void {
      const ts = new Date().toISOString();
      process.stderr.write(`[${ts}] [${nodeName}] ERROR: ${message}\n`);
    },
  };
}

export type NodeLogger = ReturnType<typeof createNodeLogger>;

/**
 * Safely read a file from the spec directory. Returns empty string if file doesn't exist.
 */
export function readSpecFile(specDir: string, filename: string): string {
  try {
    return readFileSync(join(specDir, filename), 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Build executor options with cwd and optional session resume.
 */
export function buildExecutorOptions(
  state: FeatureAgentState,
  executor: IAgentExecutor
): AgentExecutionOptions {
  const options: AgentExecutionOptions = {
    cwd: state.worktreePath || state.repositoryPath,
  };
  if (state.sessionId && executor.supportsFeature(AgentFeature.sessionResume)) {
    options.resumeSession = state.sessionId;
  }
  return options;
}

/**
 * Execute a node with consistent logging and error handling.
 *
 * Wraps the node's core logic with:
 * - Entry/exit logging with timing
 * - Error catching that returns error state instead of throwing
 * - Consistent state shape for success and failure
 */
export function executeNode(
  nodeName: string,
  executor: IAgentExecutor,
  buildPrompt: (state: FeatureAgentState, log: NodeLogger) => string
): (state: FeatureAgentState) => Promise<Partial<FeatureAgentState>> {
  const log = createNodeLogger(nodeName);

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.info('Starting...');
    reportNodeStart(nodeName);
    const startTime = Date.now();

    try {
      const prompt = buildPrompt(state, log);
      const options = buildExecutorOptions(state, executor);

      log.info(`Executing agent at cwd=${options.cwd}`);
      log.info(`Prompt length: ${prompt.length} chars`);
      const result = await executor.execute(prompt, options);
      log.info(`Agent returned sessionId=${result.sessionId ?? '(none)'}`);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.info(`Complete (${result.result.length} chars, ${elapsed}s)`);

      return {
        currentNode: nodeName,
        sessionId: result.sessionId ?? state.sessionId,
        messages: [`[${nodeName}] Complete (${result.result.length} chars, ${elapsed}s)`],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.error(`${message} (after ${elapsed}s)`);

      return {
        currentNode: nodeName,
        error: message,
        messages: [`[${nodeName}] Error: ${message}`],
      };
    }
  };
}
