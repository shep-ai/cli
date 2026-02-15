/**
 * Shared foundation for feature-agent graph nodes.
 *
 * Provides consistent logging, spec file reading, executor invocation,
 * and error handling so every node follows the same patterns.
 */

import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { interrupt, isGraphBubbleUp } from '@langchain/langgraph';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
} from '@/application/ports/output/agents/agent-executor.interface.js';
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
 * Build executor options with cwd. Each node gets a clean agent context.
 */
export function buildExecutorOptions(state: FeatureAgentState): AgentExecutionOptions {
  return {
    cwd: state.worktreePath || state.repositoryPath,
  };
}

/**
 * Sanitize YAML content to handle common AI-generated issues.
 * Quotes unquoted list items containing `{` or `}` characters
 * which js-yaml interprets as flow mappings.
 */
function sanitizeYamlBraces(content: string): string {
  return content.replace(
    /^(\s*- )(?!['"])(.+[{}].+)$/gm,
    (_match, prefix: string, value: string) =>
      `${prefix}"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  );
}

/**
 * Parse YAML with automatic sanitization of common AI-generated issues.
 * First attempts normal parsing; on failure, sanitizes unquoted braces
 * in list items and retries.
 */
export function safeYamlLoad(content: string): unknown {
  try {
    return yaml.load(content);
  } catch (firstError) {
    const sanitized = sanitizeYamlBraces(content);
    if (sanitized === content) throw firstError; // nothing to sanitize
    return yaml.load(sanitized);
  }
}

/** Nodes that are auto-approved (no interrupt) for each approval mode. */
const AUTO_APPROVED_NODES: Record<string, string[]> = {
  interactive: [],
  'allow-prd': ['analyze', 'requirements'],
  'allow-plan': ['analyze', 'requirements', 'research', 'plan'],
  'allow-all': ['analyze', 'requirements', 'research', 'plan', 'implement'],
};

/**
 * Determine whether the current node should trigger an interrupt
 * for human approval given the configured approval mode.
 */
export function shouldInterrupt(nodeName: string, approvalMode: string | undefined): boolean {
  if (!approvalMode || approvalMode === 'allow-all') return false;
  const autoApproved = AUTO_APPROVED_NODES[approvalMode] ?? [];
  return !autoApproved.includes(nodeName);
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
      const options = buildExecutorOptions(state);

      log.info(`Executing agent at cwd=${options.cwd}`);
      log.info(`Prompt length: ${prompt.length} chars`);
      const result = await executor.execute(prompt, options);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.info(`Complete (${result.result.length} chars, ${elapsed}s)`);

      const nodeResult: Partial<FeatureAgentState> = {
        currentNode: nodeName,
        messages: [`[${nodeName}] Complete (${result.result.length} chars, ${elapsed}s)`],
      };

      // Human-in-the-loop: interrupt after node execution for review
      if (shouldInterrupt(nodeName, state.approvalMode)) {
        log.info('Interrupting for human approval');
        interrupt({
          node: nodeName,
          result: result.result.slice(0, 500),
          message: `Node "${nodeName}" completed. Approve to continue.`,
        });
      }

      return nodeResult;
    } catch (err: unknown) {
      // Re-throw LangGraph control-flow exceptions (interrupt, Command, etc.)
      if (isGraphBubbleUp(err)) throw err;

      const message = err instanceof Error ? err.message : String(err);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.error(`${message} (after ${elapsed}s)`);

      // Throw so LangGraph does NOT checkpoint this node as "completed".
      // The worker catch block marks the run as failed, and on resume
      // LangGraph re-executes from the last successfully checkpointed node.
      throw new Error(`[${nodeName}] ${message}`);
    }
  };
}
