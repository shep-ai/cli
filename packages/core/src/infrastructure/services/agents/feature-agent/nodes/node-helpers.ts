/**
 * Shared foundation for feature-agent graph nodes.
 *
 * Provides consistent logging, spec file reading, executor invocation,
 * and error handling so every node follows the same patterns.
 */

import yaml from 'js-yaml';
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { interrupt, isGraphBubbleUp } from '@langchain/langgraph';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
} from '@/application/ports/output/agents/agent-executor.interface.js';
import type { ApprovalGates } from '@/domain/generated/output.js';
import type { FeatureAgentState } from '../state.js';
import { reportNodeStart } from '../heartbeat.js';
import {
  recordPhaseStart,
  recordPhaseEnd,
  recordApprovalWaitStart,
} from '../phase-timing-context.js';
import { updateNodeLifecycle } from '../lifecycle-context.js';

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
    maxTurns: 50,
    disableMcp: true,
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

/**
 * Determine whether the current node should trigger an interrupt
 * for human approval given the configured approval gates.
 *
 * Gates control which phases auto-approve:
 * - allowPrd: when true, skip interrupt after requirements phase
 * - allowPlan: when true, skip interrupt after plan phase
 * - allowMerge: when true, skip interrupt after merge phase
 *
 * Nodes not covered by a gate (analyze, research, implement) never interrupt.
 * Implementation always proceeds to merge; the merge node handles its own gate.
 *
 */
export function shouldInterrupt(nodeName: string, gates: ApprovalGates | undefined): boolean {
  if (!gates) return false;

  if (gates.allowPrd && gates.allowPlan && gates.allowMerge) return false;
  if (nodeName === 'requirements') return !gates.allowPrd;
  if (nodeName === 'plan') return !gates.allowPlan;
  if (nodeName === 'merge') return !gates.allowMerge;
  return false;
}

/* ------------------------------------------------------------------ */
/*  Error classification & retry                                      */
/* ------------------------------------------------------------------ */

export type ErrorCategory = 'retryable-api' | 'retryable-network' | 'non-retryable' | 'unknown';

const API_ERROR_RE = /API Error: (400|429|5\d{2})/;
const NETWORK_ERROR_RE = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|timed out/i;
const NON_RETRYABLE_RE = /Process exited with code|ENOENT|SyntaxError/;

/**
 * Classify an error message into a retry category.
 *
 * - **retryable-api**: Transient API errors (rate-limit, overload, bad request)
 * - **retryable-network**: Network-level failures (DNS, timeouts, connection refused)
 * - **non-retryable**: Logic / filesystem / syntax errors that won't resolve on retry
 * - **unknown**: Anything unrecognised (callers may choose to retry cautiously)
 */
export function classifyError(errorMessage: string): ErrorCategory {
  if (API_ERROR_RE.test(errorMessage)) return 'retryable-api';
  if (NETWORK_ERROR_RE.test(errorMessage)) return 'retryable-network';
  if (NON_RETRYABLE_RE.test(errorMessage)) return 'non-retryable';
  return 'unknown';
}

export interface RetryOptions {
  /** Maximum number of execution attempts (default 3). */
  maxAttempts?: number;
  /** Base delay in ms before the first retry (default 2000). Doubles each retry. */
  baseDelayMs?: number;
  /** Optional logger for retry messages. */
  logger?: NodeLogger;
}

/**
 * Execute a prompt via the given executor with automatic retry and
 * exponential back-off for transient errors.
 *
 * Non-retryable errors are thrown immediately. Unknown errors are
 * retried (conservative stance: could be transient).
 */
export async function retryExecute(
  executor: IAgentExecutor,
  prompt: string,
  options: AgentExecutionOptions,
  retryOpts?: RetryOptions
): Promise<AgentExecutionResult> {
  const maxAttempts = retryOpts?.maxAttempts ?? 3;
  const baseDelayMs = retryOpts?.baseDelayMs ?? 2000;
  const log = retryOpts?.logger;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await executor.execute(prompt, options);
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const category = classifyError(lastError.message);

      if (category === 'non-retryable') {
        throw lastError;
      }

      if (attempt < maxAttempts) {
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        log?.info(
          `Attempt ${attempt}/${maxAttempts} failed (${category}), retrying in ${delayMs}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError!;
}

/**
 * Read completed phases from feature.yaml.
 */
export function getCompletedPhases(specDir: string): string[] {
  const content = readSpecFile(specDir, 'feature.yaml');
  if (!content) return [];
  try {
    const data = yaml.load(content) as Record<string, unknown>;
    const status = (data?.status ?? {}) as Record<string, unknown>;
    const phases = status.completedPhases;
    return Array.isArray(phases) ? phases : [];
  } catch {
    return [];
  }
}

/**
 * Remove a phase from completedPhases in feature.yaml.
 * Used when a phase is rejected and needs to re-execute.
 */
export function clearCompletedPhase(specDir: string, phaseId: string, log?: NodeLogger): void {
  try {
    const content = readSpecFile(specDir, 'feature.yaml');
    if (!content) return;
    const data = yaml.load(content) as Record<string, unknown>;
    if (!data || typeof data !== 'object') return;
    const status = (data.status ?? {}) as Record<string, unknown>;
    const completedPhases = Array.isArray(status.completedPhases)
      ? status.completedPhases.filter((p: string) => p !== phaseId)
      : [];
    data.status = { ...status, completedPhases };
    writeFileSync(
      join(specDir, 'feature.yaml'),
      yaml.dump(data, { indent: 2, lineWidth: -1 }),
      'utf-8'
    );
  } catch (err) {
    log?.error(
      `Failed to clear completed phase: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Type guard to detect rejection payloads from interrupt() return value.
 */
export function isRejectionPayload(value: unknown): value is { rejected: true; feedback: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'rejected' in value &&
    (value as Record<string, unknown>).rejected === true
  );
}

/**
 * Mark a phase as complete in feature.yaml by adding its ID to completedPhases.
 */
export function markPhaseComplete(specDir: string, phaseId: string, log?: NodeLogger): void {
  try {
    const content = readSpecFile(specDir, 'feature.yaml');
    if (!content) return;
    const data = yaml.load(content) as Record<string, unknown>;
    if (!data || typeof data !== 'object') return;
    const status = (data.status ?? {}) as Record<string, unknown>;
    const completedPhases = Array.isArray(status.completedPhases)
      ? [...status.completedPhases]
      : [];
    if (!completedPhases.includes(phaseId)) {
      completedPhases.push(phaseId);
    }
    data.status = { ...status, completedPhases };
    writeFileSync(
      join(specDir, 'feature.yaml'),
      yaml.dump(data, { indent: 2, lineWidth: -1 }),
      'utf-8'
    );
  } catch (err) {
    log?.error(
      `Failed to mark phase complete: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Write a spec file atomically using temp-file-then-rename pattern.
 * Prevents corruption on crash mid-write.
 */
export function writeSpecFileAtomic(specDir: string, filename: string, content: string): void {
  const targetPath = join(specDir, filename);
  const tempPath = join(specDir, `.${filename}.tmp`);
  try {
    writeFileSync(tempPath, content, 'utf-8');
    renameSync(tempPath, targetPath);
  } finally {
    try {
      unlinkSync(tempPath);
    } catch {
      // Temp file already renamed or doesn't exist
    }
  }
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

    // Update feature lifecycle to reflect the current phase
    await updateNodeLifecycle(nodeName);

    // On resume from interrupt, LangGraph re-executes the node function from
    // the top. Instead of re-executing within this invocation (which would
    // require a second interrupt() call and trigger the stale-replay bug),
    // we return early. Rejection sets _needsReexecution=true so a conditional
    // edge in the graph routes back to this node for a fresh invocation.
    const completedPhases = getCompletedPhases(state.specDir);
    if (completedPhases.includes(nodeName)) {
      if (shouldInterrupt(nodeName, state.approvalGates)) {
        if (state._approvalAction === 'rejected') {
          const feedback = state._rejectionFeedback ?? '(no feedback)';
          log.info(`Phase rejected with feedback: "${feedback}" — scheduling re-execution`);
          clearCompletedPhase(state.specDir, nodeName, log);
          // Return early — the conditional edge will route back to this node
          // for a fresh invocation with a clean interrupt index.
          return {
            currentNode: nodeName,
            messages: [`[${nodeName}] Rejected — will re-execute`],
            _approvalAction: null,
            _rejectionFeedback: null,
            _needsReexecution: true,
          };
        } else {
          log.info('Phase approved, skipping re-execution');
          return {
            currentNode: nodeName,
            messages: [`[${nodeName}] Approved — continuing`],
            _approvalAction: null,
            _rejectionFeedback: null,
            _needsReexecution: false,
          };
        }
      } else {
        log.info('Phase already completed (no gate), skipping execution');
        return {
          currentNode: nodeName,
          messages: [`[${nodeName}] Approved — continuing`],
          _needsReexecution: false,
        };
      }
    }

    const startTime = Date.now();

    // Record phase start (no-op if timing context not set)
    const timingId = await recordPhaseStart(nodeName);

    try {
      const prompt = buildPrompt(state, log);
      const options = buildExecutorOptions(state);

      log.info(`Executing agent at cwd=${options.cwd}`);
      log.info(`Prompt length: ${prompt.length} chars`);
      const result = await executor.execute(prompt, options);
      const durationMs = Date.now() - startTime;
      const elapsed = (durationMs / 1000).toFixed(1);
      log.info(`Complete (${result.result.length} chars, ${elapsed}s)`);

      // Record phase completion
      await recordPhaseEnd(timingId, durationMs);

      // Mark phase complete BEFORE interrupting so that on resume the
      // node detects the work is already done and returns early.
      markPhaseComplete(state.specDir, nodeName, log);

      const nodeResult: Partial<FeatureAgentState> = {
        currentNode: nodeName,
        messages: [`[${nodeName}] Complete (${result.result.length} chars, ${elapsed}s)`],
        _approvalAction: null,
        _rejectionFeedback: null,
        _needsReexecution: false,
      };

      // Human-in-the-loop: interrupt after node execution for review.
      // This is the ONLY interrupt() call in the entire execution path.
      // On resume, the node returns early (above) without calling interrupt(),
      // so there is no stale interrupt replay.
      if (shouldInterrupt(nodeName, state.approvalGates)) {
        log.info('Interrupting for human approval');
        await recordApprovalWaitStart(timingId);
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
      const durationMs = Date.now() - startTime;
      const elapsed = (durationMs / 1000).toFixed(1);
      log.error(`${message} (after ${elapsed}s)`);

      // Record phase end even on failure so timing shows duration, not "running"
      await recordPhaseEnd(timingId, durationMs);

      // Throw so LangGraph does NOT checkpoint this node as "completed".
      // The worker catch block marks the run as failed, and on resume
      // LangGraph re-executes from the last successfully checkpointed node.
      throw new Error(`[${nodeName}] ${message}`);
    }
  };
}
