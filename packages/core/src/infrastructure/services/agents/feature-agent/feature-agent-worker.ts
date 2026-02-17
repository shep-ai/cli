#!/usr/bin/env node
/**
 * Feature Agent Worker
 *
 * Background worker entry point that runs as a child process via fork().
 * Initializes DI, creates the feature agent graph, and executes it.
 * Sends periodic heartbeats so the CLI can detect stuck/crashed workers.
 *
 * CLI Args: --feature-id <id> --run-id <id> --repo <path> --spec-dir <path>
 */

import 'reflect-metadata';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { Command } from '@langchain/langgraph';
import { initializeContainer, container } from '@/infrastructure/di/container.js';
import { createFeatureAgentGraph } from './feature-agent-graph.js';
import type { FeatureAgentGraphDeps } from './feature-agent-graph.js';
import { createCheckpointer } from '../common/checkpointer.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IAgentExecutorProvider } from '@/application/ports/output/agents/agent-executor-provider.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import { AgentRunStatus } from '@/domain/generated/output.js';
import { initializeSettings } from '@/infrastructure/services/settings.service.js';
import { InitializeSettingsUseCase } from '@/application/use-cases/settings/initialize-settings.use-case.js';
import { setHeartbeatContext } from './heartbeat.js';
import { setPhaseTimingContext } from './phase-timing-context.js';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import { generatePrYaml } from './nodes/pr-yaml-generator.js';

import type { ApprovalGates } from '@/domain/generated/output.js';

export interface WorkerArgs {
  featureId: string;
  runId: string;
  repo: string;
  specDir: string;
  worktreePath?: string;
  approvalGates?: ApprovalGates;
  resume?: boolean;
  threadId?: string;
  resumeFromInterrupt?: boolean;
  openPr?: boolean;
  autoMerge?: boolean;
  allowMerge?: boolean;
}

/**
 * Parse CLI arguments into a WorkerArgs object.
 * Throws if any required argument is missing.
 */
export function parseWorkerArgs(args: string[]): WorkerArgs {
  const getArg = (name: string): string => {
    const index = args.indexOf(`--${name}`);
    if (index === -1 || index + 1 >= args.length) {
      throw new Error(`Missing required argument: --${name}`);
    }
    return args[index + 1];
  };

  const worktreeIdx = args.indexOf('--worktree-path');
  const worktreePath =
    worktreeIdx !== -1 && worktreeIdx + 1 < args.length ? args[worktreeIdx + 1] : undefined;

  const approvalIdx = args.indexOf('--approval-gates');
  let approvalGates: ApprovalGates | undefined;
  if (approvalIdx !== -1 && approvalIdx + 1 < args.length) {
    try {
      approvalGates = JSON.parse(args[approvalIdx + 1]) as ApprovalGates;
    } catch {
      // Fall back to no gates if JSON parse fails
      approvalGates = undefined;
    }
  }

  const resume = args.includes('--resume');
  const resumeFromInterrupt = args.includes('--resume-from-interrupt');
  const openPr = args.includes('--open-pr');
  const autoMerge = args.includes('--auto-merge');
  const allowMerge = args.includes('--allow-merge');

  const threadIdx = args.indexOf('--thread-id');
  const threadId =
    threadIdx !== -1 && threadIdx + 1 < args.length ? args[threadIdx + 1] : undefined;

  return {
    featureId: getArg('feature-id'),
    runId: getArg('run-id'),
    repo: getArg('repo'),
    specDir: getArg('spec-dir'),
    worktreePath,
    approvalGates,
    resume,
    threadId,
    resumeFromInterrupt,
    openPr,
    autoMerge,
    allowMerge,
  };
}

/** Simple worker logger — writes to stdout which is redirected to log file by the parent. */
function log(message: string): void {
  const ts = new Date().toISOString();
  process.stdout.write(`[${ts}] [WORKER] ${message}\n`);
}

/** Heartbeat interval (30 seconds) */
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Start periodic heartbeat that updates last_heartbeat in the DB.
 * Returns a cleanup function to stop the interval.
 */
function startHeartbeat(runId: string, runRepository: IAgentRunRepository): () => void {
  const interval = setInterval(async () => {
    try {
      const now = new Date();
      await runRepository.updateStatus(runId, AgentRunStatus.running, {
        lastHeartbeat: now,
        updatedAt: now,
      });
    } catch {
      // Heartbeat failure is non-fatal — just log it
      log('Heartbeat update failed (non-fatal)');
    }
  }, HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(interval);
}

/**
 * Run the feature agent worker with the given arguments.
 * Initializes DI, creates the graph, and executes it.
 */
export async function runWorker(args: WorkerArgs): Promise<void> {
  log(`Starting with featureId=${args.featureId} runId=${args.runId}`);
  log(`  repo=${args.repo}`);
  log(`  specDir=${args.specDir}`);
  log(`  worktreePath=${args.worktreePath ?? '(none)'}`);
  log(`  approvalGates=${args.approvalGates ? JSON.stringify(args.approvalGates) : '(none)'}`);
  log(`  resume=${args.resume}`);

  log('Initializing container...');
  await initializeContainer();

  // Initialize settings in the worker process
  log('Loading settings...');
  const initSettingsUseCase = container.resolve(InitializeSettingsUseCase);
  const settings = await initSettingsUseCase.execute();
  initializeSettings(settings);

  const runRepository = container.resolve<IAgentRunRepository>('IAgentRunRepository');
  const executorProvider = container.resolve<IAgentExecutorProvider>('IAgentExecutorProvider');

  // Create executor from configured agent settings
  log('Creating executor from configured agent settings...');
  const executor = executorProvider.getExecutor();

  // Resolve merge node dependencies
  const gitPrService = container.resolve<IGitPrService>('IGitPrService');
  const featureRepository = container.resolve<IFeatureRepository>('IFeatureRepository');

  const graphDeps: FeatureAgentGraphDeps = {
    executor,
    mergeNodeDeps: {
      gitPrService,
      generatePrYaml,
      featureRepository,
    },
  };

  // Use threadId for checkpoint path so resume runs share the same checkpoint DB.
  // Falls back to runId for backwards compatibility with existing runs.
  const checkpointId = args.threadId ?? args.runId;
  const checkpointPath = join(homedir(), '.shep', 'checkpoints', `${checkpointId}.db`);
  log(`Creating checkpointer at ${checkpointPath} (thread: ${checkpointId})`);
  const checkpointer = createCheckpointer(checkpointPath);
  const graph = createFeatureAgentGraph(graphDeps, checkpointer);

  // Mark the run as running with our PID
  const now = new Date();
  log(`Updating status to running (PID ${process.pid})...`);
  await runRepository.updateStatus(args.runId, AgentRunStatus.running, {
    pid: process.pid,
    startedAt: now,
    lastHeartbeat: now,
    updatedAt: now,
  });

  // Start heartbeat so the CLI can detect if we're still alive
  const stopHeartbeat = startHeartbeat(args.runId, runRepository);

  // Set heartbeat context so node-helpers can update current node
  setHeartbeatContext(args.runId, runRepository);

  // Set phase timing context so executeNode() records per-phase durations
  const timingRepository = container.resolve<IPhaseTimingRepository>('IPhaseTimingRepository');
  setPhaseTimingContext(args.runId, timingRepository);

  try {
    const graphConfig = { configurable: { thread_id: checkpointId } };

    let result: Record<string, unknown>;
    if (args.resume && args.resumeFromInterrupt) {
      // Resume from an interrupt (human-in-the-loop approval)
      log('Resuming graph from interrupt checkpoint...');
      result = await graph.invoke(new Command({ resume: { approved: true } }), graphConfig);
    } else if (args.resume) {
      // Resume from error — re-invoke with initial state; LangGraph continues
      // from the last successfully checkpointed node.
      log('Resuming graph from error checkpoint...');
      result = await graph.invoke(
        {
          featureId: args.featureId,
          repositoryPath: args.repo,
          worktreePath: args.worktreePath ?? args.repo,
          specDir: args.specDir,
          error: undefined, // Clear previous error state
          ...(args.approvalGates ? { approvalGates: args.approvalGates } : {}),
          openPr: args.openPr ?? false,
          autoMerge: args.autoMerge ?? false,
          allowMerge: args.allowMerge ?? false,
        },
        graphConfig
      );
    } else {
      log('Starting graph invocation...');
      result = await graph.invoke(
        {
          featureId: args.featureId,
          repositoryPath: args.repo,
          worktreePath: args.worktreePath ?? args.repo,
          specDir: args.specDir,
          ...(args.approvalGates ? { approvalGates: args.approvalGates } : {}),
          openPr: args.openPr ?? false,
          autoMerge: args.autoMerge ?? false,
          allowMerge: args.allowMerge ?? false,
        },
        graphConfig
      );
    }
    log(`Graph invocation completed. Error: ${(result.error as string) ?? 'none'}`);

    stopHeartbeat();

    // Check if graph was interrupted (human-in-the-loop approval needed)
    const interruptPayload = result.__interrupt__ as { value: unknown }[] | undefined;
    if (interruptPayload && interruptPayload.length > 0) {
      const now = new Date();
      await runRepository.updateStatus(args.runId, AgentRunStatus.waitingApproval, {
        updatedAt: now,
      });
      log('Run paused — waiting for human approval');
      return;
    }

    // Check if the graph itself reported an error in state
    if (result.error) {
      const failedAt = new Date();
      await runRepository.updateStatus(args.runId, AgentRunStatus.failed, {
        error: result.error as string,
        completedAt: failedAt,
        updatedAt: failedAt,
      });
      log(`Run marked as failed: ${result.error}`);
      return;
    }

    const completedAt = new Date();
    await runRepository.updateStatus(args.runId, AgentRunStatus.completed, {
      result: (result.messages as string[])?.join('\n') ?? '',
      completedAt,
      updatedAt: completedAt,
    });
    log('Run marked as completed');
  } catch (error: unknown) {
    stopHeartbeat();
    const failedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);
    log(`Graph invocation error: ${message}`);
    await runRepository.updateStatus(args.runId, AgentRunStatus.failed, {
      error: message,
      completedAt: failedAt,
      updatedAt: failedAt,
    });
    log('Run marked as failed');
  }
}

// Catch unhandled errors globally so they always appear in the log file
process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? `${reason.message}\n${reason.stack}` : String(reason);
  log(`UNHANDLED REJECTION: ${msg}`);
  process.exit(1);
});

// Handle IPC disconnect (parent exited) gracefully — this is expected for detached workers
process.on('disconnect', () => {
  log('Parent disconnected (IPC channel closed) — continuing as detached worker');
});

// Handle SIGTERM for graceful shutdown
let runIdForSignal: string | undefined;
let runRepoForSignal: IAgentRunRepository | undefined;

process.on('SIGTERM', async () => {
  log('Received SIGTERM, shutting down...');
  if (runIdForSignal && runRepoForSignal) {
    const now = new Date();
    await runRepoForSignal.updateStatus(runIdForSignal, AgentRunStatus.interrupted, {
      error: 'Process received SIGTERM',
      completedAt: now,
      updatedAt: now,
    });
  }
  process.exit(0);
});

// Main execution when run as a script
// When using fork(), the forked process runs the entire module, but we want to detect if we're the entrypoint
const isMainModule =
  typeof require !== 'undefined'
    ? require.main === module
    : process.argv[1]?.includes('feature-agent-worker');

if (isMainModule) {
  log('Worker process starting...');
  try {
    const args = parseWorkerArgs(process.argv.slice(2));
    runIdForSignal = args.runId;

    runWorker(args)
      .then(() => {
        runRepoForSignal = container.resolve<IAgentRunRepository>('IAgentRunRepository');
        log('Worker completed successfully, exiting.');
        process.exit(0);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        log(`Worker fatal error: ${msg}`);
        process.exit(1);
      });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Worker setup error: ${msg}`);
    process.exit(1);
  }
}
