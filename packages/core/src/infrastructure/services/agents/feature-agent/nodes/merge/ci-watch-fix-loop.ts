/**
 * CI Watch/Fix Loop
 *
 * After a push, watches CI status and attempts automatic fixes when CI fails.
 * Respects configurable max attempts, timeout, and log size from settings.
 */

import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface.js';
import { CiStatus, type CiFixRecord } from '@/domain/generated/output.js';
import type { NodeLogger } from '../node-helpers.js';
import { retryExecute } from '../node-helpers.js';
import type { AgentExecutionOptions } from '@/application/ports/output/agents/agent-executor.interface.js';
import { buildCiWatchFixPrompt } from '../prompts/merge-prompts.js';
import { extractRunId, handleCiTerminalFailure, buildCiExhaustedError } from './ci-helpers.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';

export interface CiWatchFixDeps {
  executor: IAgentExecutor;
  gitPrService: IGitPrService;
  featureRepository: Pick<IFeatureRepository, 'findById' | 'update'>;
}

export interface CiWatchFixParams {
  cwd: string;
  branch: string;
  options: AgentExecutionOptions;
  feature: Awaited<ReturnType<Pick<IFeatureRepository, 'findById'>['findById']>>;
  prUrl: string | null;
  prNumber: number | null;
  existingAttempts: number;
  messages: string[];
  log: NodeLogger;
}

export type CiFixStatusValue = 'idle' | 'watching' | 'fixing' | 'success' | 'exhausted' | 'timeout';

export interface CiWatchFixResult {
  ciStatus: CiStatus;
  ciFixAttempts: number;
  ciFixHistory: CiFixRecord[];
  ciFixStatus: CiFixStatusValue;
}

/**
 * Run the CI watch/fix loop. Watches for the initial CI result, then
 * iteratively attempts fixes up to the configured maximum.
 *
 * Throws on timeout or exhausted attempts (after updating feature state).
 */
export async function runCiWatchFixLoop(
  deps: CiWatchFixDeps,
  params: CiWatchFixParams
): Promise<CiWatchFixResult> {
  const { executor, gitPrService } = deps;
  const { cwd, branch, options, feature, prUrl, prNumber, messages, log } = params;

  const settings = getSettings();
  const maxAttempts = settings.workflow?.ciMaxFixAttempts ?? 3;
  const timeoutMs = settings.workflow?.ciWatchTimeoutMs ?? 600_000;
  const logMaxChars = settings.workflow?.ciLogMaxChars ?? 50_000;
  const pollInterval = settings.workflow?.ciWatchPollIntervalSeconds ?? 30;

  let ciFixAttempts = params.existingAttempts;
  const ciFixHistory: CiFixRecord[] = [];
  let ciFixStatus: CiFixStatusValue;

  log.info(`Starting CI watch (maxAttempts=${maxAttempts}, timeout=${timeoutMs}ms)`);

  // Check if any CI run exists for this branch
  let initialCiStatus;
  try {
    initialCiStatus = await gitPrService.getCiStatus(cwd, branch);
  } catch (err) {
    // Handle GitHub API rate limits gracefully — skip CI watching
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('rate limit') || errMsg.includes('403')) {
      log.info('GitHub API rate limit hit — skipping CI watch');
      return { ciStatus: CiStatus.Success, ciFixAttempts, ciFixHistory, ciFixStatus: 'idle' };
    }
    throw err;
  }
  if (!initialCiStatus.runUrl) {
    // No CI run detected — check if PR has merge conflicts which would prevent CI from running
    if (params.prNumber != null) {
      try {
        const mergeable = await gitPrService.getMergeableStatus(cwd, params.prNumber);
        if (mergeable === false) {
          log.info('No CI run detected — PR has merge conflicts');
          return {
            ciStatus: CiStatus.Failure,
            ciFixAttempts,
            ciFixHistory,
            ciFixStatus: 'idle',
          };
        }
      } catch {
        // getMergeableStatus failed — fall through to idle/success
      }
    }
    log.info('No CI run detected after push — skipping CI watch');
    return { ciStatus: CiStatus.Success, ciFixAttempts, ciFixHistory, ciFixStatus: 'idle' };
  }

  let runUrl = initialCiStatus.runUrl;

  // Initial CI watch
  let watchResult;
  try {
    watchResult = await gitPrService.watchCi(cwd, branch, timeoutMs, pollInterval);
  } catch (err) {
    if (err instanceof GitPrError && err.code === GitPrErrorCode.CI_TIMEOUT) {
      log.info('Initial CI watch timed out');
      ciFixHistory.push({
        attempt: ciFixAttempts + 1,
        startedAt: new Date().toISOString(),
        failureSummary: 'CI watch timed out',
        outcome: 'timeout',
      });
      await handleCiTerminalFailure(feature, prUrl, prNumber, deps.featureRepository, messages);
      throw buildCiExhaustedError(ciFixAttempts + 1, ciFixHistory, 'timeout');
    }
    throw err;
  }

  // Use the run URL from watchCi — it reflects the actual run watched,
  // which may differ from the initial getCiStatus() result when multiple
  // workflow runs exist for the same branch.
  if (watchResult.runUrl) runUrl = watchResult.runUrl;

  if (watchResult.status === 'success') {
    log.info('CI passed on first watch');
    return { ciStatus: CiStatus.Success, ciFixAttempts, ciFixHistory, ciFixStatus: 'success' };
  }

  // CI failed — enter fix loop
  while (true) {
    // Fail-fast: check attempt count BEFORE invoking executor (NFR-3)
    if (ciFixAttempts >= maxAttempts) {
      log.info(`CI fix loop exhausted after ${ciFixAttempts} attempt(s)`);
      ciFixStatus = 'exhausted';
      break;
    }

    // Fetch failure logs
    const runId = extractRunId(runUrl) ?? '';
    const failureLogs = await gitPrService.getFailureLogs(cwd, runId, branch, logMaxChars);
    const startedAt = new Date().toISOString();

    log.info(`CI fix attempt ${ciFixAttempts + 1}/${maxAttempts} for run ${runId}`);

    // Invoke fix executor — maxAttempts:1 prevents retryExecute's internal
    // retry logic from consuming CI fix attempts behind the outer loop's back.
    // Each CI fix is a unique attempt with distinct failure logs and prompt;
    // the outer loop already handles iteration.
    const fixPrompt = buildCiWatchFixPrompt(failureLogs, ciFixAttempts + 1, maxAttempts, branch);
    try {
      await retryExecute(executor, fixPrompt, options, { maxAttempts: 1, logger: log });
    } catch (execErr) {
      // If the fix executor fails, count it as a failed attempt and continue
      // the loop rather than killing the entire CI fix process.
      const execMsg = execErr instanceof Error ? execErr.message : String(execErr);
      log.info(`CI fix executor failed on attempt ${ciFixAttempts + 1}: ${execMsg}`);
      ciFixAttempts++;
      ciFixHistory.push({
        attempt: ciFixAttempts,
        startedAt,
        failureSummary: `Executor error: ${execMsg.slice(0, 500)}`,
        outcome: 'failed',
      });
      messages.push(`[merge] CI fix attempt ${ciFixAttempts}/${maxAttempts} — executor failed`);
      continue;
    }
    ciFixAttempts++;

    // Get updated run URL (new run triggered by push in fix)
    const updatedCiStatus = await gitPrService.getCiStatus(cwd, branch);
    if (updatedCiStatus.runUrl) runUrl = updatedCiStatus.runUrl;

    // Watch CI after fix
    let fixWatchResult;
    try {
      fixWatchResult = await gitPrService.watchCi(cwd, branch, timeoutMs, pollInterval);
    } catch (err) {
      if (err instanceof GitPrError && err.code === GitPrErrorCode.CI_TIMEOUT) {
        log.info(`CI watch timed out during fix attempt ${ciFixAttempts}`);
        ciFixHistory.push({
          attempt: ciFixAttempts,
          startedAt,
          failureSummary: failureLogs.slice(0, 500),
          outcome: 'timeout',
        });
        ciFixStatus = 'timeout';
        break;
      }
      // For non-timeout watchCi errors (e.g. GIT_ERROR), treat as a failed
      // attempt and continue the loop instead of killing it.
      const watchMsg = err instanceof Error ? err.message : String(err);
      log.info(`CI watch failed during fix attempt ${ciFixAttempts}: ${watchMsg}`);
      ciFixHistory.push({
        attempt: ciFixAttempts,
        startedAt,
        failureSummary: failureLogs.slice(0, 500),
        outcome: 'failed',
      });
      messages.push(`[merge] CI fix attempt ${ciFixAttempts}/${maxAttempts} — watch failed`);
      continue;
    }

    // Update runUrl to the run that was actually watched (avoids mismatch
    // when multiple workflow runs exist for the same branch).
    if (fixWatchResult.runUrl) runUrl = fixWatchResult.runUrl;

    const outcome = fixWatchResult.status === 'success' ? 'fixed' : 'failed';
    ciFixHistory.push({
      attempt: ciFixAttempts,
      startedAt,
      failureSummary: failureLogs.slice(0, 500),
      outcome,
    });

    if (fixWatchResult.status === 'success') {
      log.info(`CI passed after fix attempt ${ciFixAttempts}`);
      ciFixStatus = 'success';
      return { ciStatus: CiStatus.Success, ciFixAttempts, ciFixHistory, ciFixStatus };
    }

    log.info(`CI still failing after fix attempt ${ciFixAttempts}`);
    messages.push(`[merge] CI fix attempt ${ciFixAttempts}/${maxAttempts} — still failing`);
  }

  // Handle terminal failure states
  await handleCiTerminalFailure(feature, prUrl, prNumber, deps.featureRepository, messages);
  throw buildCiExhaustedError(ciFixAttempts, ciFixHistory, ciFixStatus as 'exhausted' | 'timeout');
}
