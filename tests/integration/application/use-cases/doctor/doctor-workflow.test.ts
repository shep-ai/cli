/**
 * Doctor Workflow Integration Tests
 *
 * Tests the DoctorDiagnoseUseCase end-to-end with all dependencies mocked
 * at the service interface boundary. Covers:
 * - Complete maintainer flow (push access -> direct clone -> PR)
 * - Complete contributor flow (no push access -> fork -> clone -> PR)
 * - Issue-only flow (--no-fix)
 * - Agent failure graceful degradation
 * - Prerequisite failures (gh not installed, gh not authenticated)
 * - Service call sequencing and data flow between steps
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoctorDiagnoseUseCase } from '@/application/use-cases/doctor/doctor-diagnose.use-case.js';
import type { AgentRun } from '@/domain/generated/output.js';
import { AgentRunStatus, AgentType } from '@/domain/generated/output.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import type { PhaseTiming } from '@/domain/generated/output.js';
import type { IVersionService } from '@/application/ports/output/services/version-service.interface.js';
import type { IGitHubIssueService } from '@/application/ports/output/services/github-issue-service.interface.js';
import type { IGitHubRepositoryService } from '@/application/ports/output/services/github-repository-service.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { IAgentExecutorProvider } from '@/application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service.js';
import {
  GitHubIssueError,
  GitHubIssueErrorCode,
} from '@/application/ports/output/services/github-issue-service.interface.js';

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

function createFailedAgentRun(id: string, overrides?: Partial<AgentRun>): AgentRun {
  return {
    id,
    agentType: AgentType.ClaudeCode,
    agentName: `agent-${id}`,
    status: AgentRunStatus.failed,
    error: `Error in ${id}: unexpected token`,
    prompt: 'Sensitive prompt data — should be excluded',
    result: 'Sensitive result data — should be excluded',
    threadId: `thread-${id}`,
    createdAt: new Date('2025-06-15T10:00:00Z'),
    updatedAt: new Date('2025-06-15T10:05:00Z'),
    ...overrides,
  };
}

function createCompletedAgentRun(id: string): AgentRun {
  return {
    id,
    agentType: AgentType.ClaudeCode,
    agentName: `agent-${id}`,
    status: AgentRunStatus.completed,
    prompt: 'some prompt',
    threadId: `thread-${id}`,
    createdAt: new Date('2025-06-15T09:00:00Z'),
    updatedAt: new Date('2025-06-15T09:30:00Z'),
  };
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockAgentRunRepo(runs: AgentRun[] = []): IAgentRunRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByThreadId: vi.fn(),
    updateStatus: vi.fn(),
    findRunningByPid: vi.fn(),
    list: vi.fn<() => Promise<AgentRun[]>>().mockResolvedValue(runs),
    delete: vi.fn(),
  };
}

function createMockVersionService(version = '2.0.0'): IVersionService {
  return {
    getVersion: vi.fn().mockReturnValue({
      name: '@shepai/cli',
      version,
      description: 'Autonomous AI Native SDLC Platform',
    }),
  };
}

function createMockIssueService(
  issueUrl = 'https://github.com/shep-ai/cli/issues/100',
  issueNumber = 100
): IGitHubIssueService {
  return {
    createIssue: vi.fn().mockResolvedValue({ url: issueUrl, number: issueNumber }),
  };
}

function createMockRepoService(options?: {
  hasPushAccess?: boolean;
  pushAccessError?: Error;
  forkNameWithOwner?: string;
}): IGitHubRepositoryService {
  const opts = {
    hasPushAccess: false,
    forkNameWithOwner: 'contributor/cli',
    ...options,
  };

  const checkPushAccess = vi.fn<(repo: string) => Promise<boolean>>();
  if (opts.pushAccessError) {
    checkPushAccess.mockRejectedValue(opts.pushAccessError);
  } else {
    checkPushAccess.mockResolvedValue(opts.hasPushAccess);
  }

  return {
    checkAuth: vi.fn().mockResolvedValue(undefined),
    cloneRepository: vi.fn().mockResolvedValue(undefined),
    listUserRepositories: vi.fn().mockResolvedValue([]),
    parseGitHubUrl: vi.fn(),
    checkPushAccess,
    forkRepository: vi.fn().mockResolvedValue({
      nameWithOwner: opts.forkNameWithOwner,
      cloneUrl: `https://github.com/${opts.forkNameWithOwner}.git`,
    }),
    getViewerPermission: vi.fn().mockResolvedValue('READ'),
  };
}

function createMockPrService(prUrl = 'https://github.com/shep-ai/cli/pull/50'): IGitPrService {
  return {
    hasRemote: vi.fn().mockResolvedValue(true),
    getRemoteUrl: vi.fn().mockResolvedValue(null),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    revParse: vi.fn().mockResolvedValue('abc123'),
    hasUncommittedChanges: vi.fn().mockResolvedValue(true),
    commitAll: vi.fn().mockResolvedValue('commit-sha-123'),
    push: vi.fn().mockResolvedValue(undefined),
    createPr: vi.fn().mockResolvedValue({ url: prUrl, number: 50 }),
    createPrFromArgs: vi.fn().mockResolvedValue({ url: prUrl, number: 50 }),
    mergePr: vi.fn(),
    mergeBranch: vi.fn(),
    getCiStatus: vi.fn(),
    watchCi: vi.fn(),
    deleteBranch: vi.fn(),
    getPrDiffSummary: vi.fn(),
    getFileDiffs: vi.fn(),
    listPrStatuses: vi.fn(),
    verifyMerge: vi.fn(),
    localMergeSquash: vi.fn(),
    getMergeableStatus: vi.fn(),
    getFailureLogs: vi.fn(),
    syncMain: vi.fn(),
    rebaseOnMain: vi.fn(),
    getConflictedFiles: vi.fn().mockResolvedValue([]),
    stageFiles: vi.fn(),
    rebaseContinue: vi.fn(),
    rebaseAbort: vi.fn(),
    getBranchSyncStatus: vi.fn().mockResolvedValue({ ahead: 0, behind: 0 }),
  };
}

function createMockAgentExecutorProvider(options?: { executeError?: Error }): {
  provider: IAgentExecutorProvider;
  executor: IAgentExecutor;
} {
  const executor: IAgentExecutor = {
    agentType: AgentType.ClaudeCode,
    execute: options?.executeError
      ? vi.fn().mockRejectedValue(options.executeError)
      : vi.fn().mockResolvedValue({ result: 'Fix applied successfully', sessionId: 'session-1' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };

  const provider: IAgentExecutorProvider = {
    getExecutor: vi.fn().mockResolvedValue(executor),
  };

  return { provider, executor };
}

function createMockExecFunction(): ExecFunction {
  return vi.fn().mockResolvedValue({ stdout: 'gh version 2.50.0\n', stderr: '' });
}

function createMockFeatureRepo(): IFeatureRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    findByIdPrefix: vi.fn().mockResolvedValue(null),
    findBySlug: vi.fn().mockResolvedValue(null),
    findByBranch: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    findByParentId: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
    softDelete: vi.fn(),
  };
}

function createMockPhaseTimingRepo(): Pick<IPhaseTimingRepository, 'findByFeatureId'> {
  return {
    findByFeatureId: vi.fn<(featureId: string) => Promise<PhaseTiming[]>>().mockResolvedValue([]),
  };
}

// ---------------------------------------------------------------------------
// Helper to build the use case with all mocks
// ---------------------------------------------------------------------------

interface MockSet {
  agentRunRepo: IAgentRunRepository;
  versionService: IVersionService;
  issueService: IGitHubIssueService;
  repoService: IGitHubRepositoryService;
  prService: IGitPrService;
  agentExecutorProvider: IAgentExecutorProvider;
  agentExecutor: IAgentExecutor;
  execFunction: ExecFunction;
  featureRepo: IFeatureRepository;
  phaseTimingRepo: Pick<IPhaseTimingRepository, 'findByFeatureId'>;
}

function buildUseCase(mocks: MockSet): DoctorDiagnoseUseCase {
  return new DoctorDiagnoseUseCase(
    mocks.agentRunRepo,
    mocks.versionService,
    mocks.issueService,
    mocks.repoService,
    mocks.prService,
    mocks.agentExecutorProvider,
    mocks.execFunction,
    mocks.featureRepo,
    mocks.phaseTimingRepo as any
  );
}

// ---------------------------------------------------------------------------
// Integration Tests
// ---------------------------------------------------------------------------

describe('DoctorDiagnoseUseCase Integration', () => {
  // -----------------------------------------------------------------------
  // 1. Complete Maintainer Flow
  // -----------------------------------------------------------------------

  describe('maintainer flow end-to-end', () => {
    let mocks: MockSet;
    let useCase: DoctorDiagnoseUseCase;

    beforeEach(() => {
      const failedRuns = [
        createFailedAgentRun('run-1', {
          agentName: 'analyze-repository',
          error: 'TypeError: Cannot read properties of undefined',
        }),
        createFailedAgentRun('run-2', {
          agentName: 'implement-feature',
          error: 'SyntaxError: Unexpected token',
        }),
      ];
      const completedRuns = [createCompletedAgentRun('run-3')];

      const { provider, executor } = createMockAgentExecutorProvider();
      mocks = {
        agentRunRepo: createMockAgentRunRepo([...completedRuns, ...failedRuns]),
        versionService: createMockVersionService('2.1.0'),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/200', 200),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService: createMockPrService('https://github.com/shep-ai/cli/pull/201'),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      useCase = buildUseCase(mocks);
    });

    it('should execute the full diagnostic -> issue -> clone -> agent -> PR pipeline', async () => {
      const result = await useCase.execute({
        description: 'The analyze-repository agent crashes with TypeError',
        fix: true,
        workdir: '/tmp/doctor-test',
      });

      // 1. Diagnostics were collected
      expect(mocks.agentRunRepo.list).toHaveBeenCalledOnce();
      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(2);
      expect(result.diagnosticReport.cliVersion).toBe('2.1.0');
      expect(result.diagnosticReport.systemInfo.nodeVersion).toBe(process.version);

      // 2. Issue was created with proper content
      expect(mocks.issueService.createIssue).toHaveBeenCalledOnce();
      const [repo, title, body, labels] = vi.mocked(mocks.issueService.createIssue).mock.calls[0];
      expect(repo).toBe('shep-ai/cli');
      expect(title).toContain('[shep doctor]');
      expect(title).toContain('The analyze-repository agent crashes');
      expect(body).toContain('TypeError: Cannot read properties of undefined');
      expect(body).toContain('SyntaxError: Unexpected token');
      expect(body).toContain('2.1.0');
      expect(body).toContain('Reported via `shep doctor`');
      expect(labels).toEqual(['bug', 'shep-doctor']);

      // 3. Push access was checked
      expect(mocks.repoService.checkPushAccess).toHaveBeenCalledWith('shep-ai/cli');

      // 4. NO fork (maintainer has push access)
      expect(mocks.repoService.forkRepository).not.toHaveBeenCalled();

      // 5. Cloned shep-ai/cli directly (not a fork)
      expect(mocks.repoService.cloneRepository).toHaveBeenCalledWith(
        'shep-ai/cli',
        '/tmp/doctor-test',
        undefined
      );

      // 6. Branch was created
      expect(mocks.execFunction).toHaveBeenCalledWith(
        'git',
        ['checkout', '-b', 'doctor/fix-200'],
        expect.objectContaining({ cwd: '/tmp/doctor-test' })
      );

      // 7. Agent was invoked with proper context
      expect(mocks.agentExecutorProvider.getExecutor).toHaveBeenCalledOnce();
      const agentPrompt = vi.mocked(mocks.agentExecutor.execute).mock.calls[0][0];
      expect(agentPrompt).toContain('#200');
      expect(agentPrompt).toContain('The analyze-repository agent crashes');
      const agentOptions = vi.mocked(mocks.agentExecutor.execute).mock.calls[0][1];
      expect(agentOptions?.cwd).toBe('/tmp/doctor-test');

      // 8. Changes were committed and pushed
      expect(mocks.prService.hasUncommittedChanges).toHaveBeenCalledWith('/tmp/doctor-test');
      expect(mocks.prService.commitAll).toHaveBeenCalledWith(
        '/tmp/doctor-test',
        'fix: address issue #200 reported via shep doctor'
      );
      expect(mocks.prService.push).toHaveBeenCalledWith('/tmp/doctor-test', 'doctor/fix-200', true);

      // 9. PR was created without cross-fork --repo flag
      const prArgs = vi.mocked(mocks.prService.createPrFromArgs).mock.calls[0][1];
      expect(prArgs.title).toContain('#200');
      expect(prArgs.body).toContain('#200');
      expect(prArgs.labels).toEqual(['shep-doctor']);
      expect(prArgs.base).toBe('main');
      expect(prArgs.repo).toBeUndefined();

      // 10. Final result
      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/200');
      expect(result.issueNumber).toBe(200);
      expect(result.prUrl).toBe('https://github.com/shep-ai/cli/pull/201');
      expect(result.flowType).toBe('maintainer');
      expect(result.error).toBeUndefined();
    });

    it('should only include failed runs in diagnostics, not completed/running ones', async () => {
      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      // 3 total runs but only 2 are failed
      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(2);
      expect(result.diagnosticReport.failedRunSummaries[0].agentName).toBe('analyze-repository');
      expect(result.diagnosticReport.failedRunSummaries[1].agentName).toBe('implement-feature');
    });

    it('should sanitize agent run summaries — no prompt or result fields', async () => {
      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      for (const summary of result.diagnosticReport.failedRunSummaries) {
        expect(summary).not.toHaveProperty('prompt');
        expect(summary).not.toHaveProperty('result');
        const serialized = JSON.stringify(summary);
        expect(serialized).not.toContain('Sensitive prompt data');
        expect(serialized).not.toContain('Sensitive result data');
      }
    });
  });

  // -----------------------------------------------------------------------
  // 2. Complete Contributor Flow
  // -----------------------------------------------------------------------

  describe('contributor flow end-to-end', () => {
    let mocks: MockSet;
    let useCase: DoctorDiagnoseUseCase;

    beforeEach(() => {
      const { provider, executor } = createMockAgentExecutorProvider();
      mocks = {
        agentRunRepo: createMockAgentRunRepo([
          createFailedAgentRun('run-1', { error: 'Agent timed out' }),
        ]),
        versionService: createMockVersionService('2.0.0'),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/300', 300),
        repoService: createMockRepoService({
          hasPushAccess: false,
          forkNameWithOwner: 'contributor/cli',
        }),
        prService: createMockPrService('https://github.com/shep-ai/cli/pull/301'),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      useCase = buildUseCase(mocks);
    });

    it('should fork, clone fork, and create cross-fork PR with --repo flag', async () => {
      const result = await useCase.execute({
        description: 'Agent timed out during code generation',
        fix: true,
        workdir: '/tmp/contributor-test',
      });

      // 1. Issue created
      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/300');
      expect(result.issueNumber).toBe(300);

      // 2. Push access checked (returns false)
      expect(mocks.repoService.checkPushAccess).toHaveBeenCalledWith('shep-ai/cli');

      // 3. Fork was requested
      expect(mocks.repoService.forkRepository).toHaveBeenCalledWith('shep-ai/cli');

      // 4. Cloned the FORK (not shep-ai/cli directly)
      expect(mocks.repoService.cloneRepository).toHaveBeenCalledWith(
        'contributor/cli',
        '/tmp/contributor-test',
        undefined
      );

      // 5. Branch named after issue
      expect(mocks.execFunction).toHaveBeenCalledWith(
        'git',
        ['checkout', '-b', 'doctor/fix-300'],
        expect.objectContaining({ cwd: '/tmp/contributor-test' })
      );

      // 6. Agent invoked
      expect(mocks.agentExecutor.execute).toHaveBeenCalled();

      // 7. PR created WITH cross-fork --repo flag
      const prArgs = vi.mocked(mocks.prService.createPrFromArgs).mock.calls[0][1];
      expect(prArgs.repo).toBe('shep-ai/cli');
      expect(prArgs.title).toContain('#300');
      expect(prArgs.base).toBe('main');

      // 8. Final result
      expect(result.prUrl).toBe('https://github.com/shep-ai/cli/pull/301');
      expect(result.flowType).toBe('contributor');
      expect(result.error).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // 3. Issue-Only Flow (--no-fix)
  // -----------------------------------------------------------------------

  describe('issue-only flow (fix=false)', () => {
    let mocks: MockSet;
    let useCase: DoctorDiagnoseUseCase;

    beforeEach(() => {
      const { provider, executor } = createMockAgentExecutorProvider();
      mocks = {
        agentRunRepo: createMockAgentRunRepo([
          createFailedAgentRun('run-1', { error: 'Memory limit exceeded' }),
        ]),
        versionService: createMockVersionService('1.9.0'),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/400', 400),
        repoService: createMockRepoService(),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      useCase = buildUseCase(mocks);
    });

    it('should create issue but skip entire fix workflow', async () => {
      const result = await useCase.execute({
        description: 'Memory limit exceeded during large repo analysis',
        fix: false,
      });

      // Issue was created
      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/400');
      expect(result.issueNumber).toBe(400);
      expect(mocks.issueService.createIssue).toHaveBeenCalledOnce();

      // Diagnostic report includes the error context
      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(1);
      expect(result.diagnosticReport.failedRunSummaries[0].error).toBe('Memory limit exceeded');
      expect(result.diagnosticReport.cliVersion).toBe('1.9.0');

      // No fix-related operations
      expect(mocks.repoService.checkPushAccess).not.toHaveBeenCalled();
      expect(mocks.repoService.forkRepository).not.toHaveBeenCalled();
      expect(mocks.repoService.cloneRepository).not.toHaveBeenCalled();
      expect(mocks.agentExecutorProvider.getExecutor).not.toHaveBeenCalled();
      expect(mocks.prService.createPrFromArgs).not.toHaveBeenCalled();
      expect(mocks.prService.commitAll).not.toHaveBeenCalled();
      expect(mocks.prService.push).not.toHaveBeenCalled();

      // No PR URL
      expect(result.prUrl).toBeUndefined();
      expect(result.flowType).toBeUndefined();
    });

    it('should include issue body with diagnostic sections when no failed runs exist', async () => {
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue([]);

      const result = await useCase.execute({
        description: 'General performance issue',
        fix: false,
      });

      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/400');
      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(0);

      // Issue body should still contain the environment section
      const issueBody = vi.mocked(mocks.issueService.createIssue).mock.calls[0][2];
      expect(issueBody).toContain('General performance issue');
      expect(issueBody).toContain('1.9.0');
      expect(issueBody).toContain('Reported via `shep doctor`');
    });
  });

  // -----------------------------------------------------------------------
  // 4. Agent Failure — Graceful Degradation
  // -----------------------------------------------------------------------

  describe('agent failure graceful degradation', () => {
    it('should return issue URL with error message when agent execution fails', async () => {
      const { provider, executor } = createMockAgentExecutorProvider({
        executeError: new Error('Agent process terminated unexpectedly'),
      });
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/500', 500),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'Something went wrong',
        fix: true,
        workdir: '/tmp/agent-fail-test',
      });

      // Issue was still created successfully
      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/500');
      expect(result.issueNumber).toBe(500);

      // Fix failed gracefully
      expect(result.prUrl).toBeUndefined();
      expect(result.error).toContain('Agent process terminated unexpectedly');
      expect(result.flowType).toBe('maintainer');

      // PR was NOT created (agent failed before that step)
      expect(mocks.prService.commitAll).not.toHaveBeenCalled();
      expect(mocks.prService.createPrFromArgs).not.toHaveBeenCalled();
    });

    it('should return error when agent produces no changes', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const prService = createMockPrService();
      vi.mocked(prService.hasUncommittedChanges).mockResolvedValue(false);

      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/501', 501),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService,
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'Minor styling issue',
        fix: true,
        workdir: '/tmp/no-changes-test',
      });

      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/501');
      expect(result.prUrl).toBeUndefined();
      expect(result.error).toContain('no changes');
      expect(mocks.prService.commitAll).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // 5. Push Access Detection Failure — Falls Back to Contributor
  // -----------------------------------------------------------------------

  describe('push access detection failure', () => {
    it('should fall back to contributor flow when push access check fails', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/600', 600),
        repoService: createMockRepoService({
          pushAccessError: new Error('Network timeout'),
          forkNameWithOwner: 'fallback-user/cli',
        }),
        prService: createMockPrService('https://github.com/shep-ai/cli/pull/601'),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'Permission check should fall back',
        fix: true,
        workdir: '/tmp/fallback-test',
      });

      // Should fall back to contributor flow
      expect(result.flowType).toBe('contributor');
      expect(mocks.repoService.forkRepository).toHaveBeenCalledWith('shep-ai/cli');
      expect(mocks.repoService.cloneRepository).toHaveBeenCalledWith(
        'fallback-user/cli',
        '/tmp/fallback-test',
        undefined
      );

      // Cross-fork PR
      const prArgs = vi.mocked(mocks.prService.createPrFromArgs).mock.calls[0][1];
      expect(prArgs.repo).toBe('shep-ai/cli');

      // Still succeeded
      expect(result.prUrl).toBe('https://github.com/shep-ai/cli/pull/601');
      expect(result.error).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // 6. Issue Creation Failure
  // -----------------------------------------------------------------------

  describe('issue creation failure', () => {
    it('should propagate issue creation errors', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const issueService = createMockIssueService();
      vi.mocked(issueService.createIssue).mockRejectedValue(
        new GitHubIssueError('gh CLI not found', GitHubIssueErrorCode.GH_NOT_FOUND)
      );

      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService,
        repoService: createMockRepoService(),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      await expect(useCase.execute({ description: 'test', fix: false })).rejects.toThrow(
        GitHubIssueError
      );

      // No fix operations attempted
      expect(mocks.repoService.checkPushAccess).not.toHaveBeenCalled();
    });

    it('should propagate auth failure errors from issue creation', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const issueService = createMockIssueService();
      vi.mocked(issueService.createIssue).mockRejectedValue(
        new GitHubIssueError('Authentication required', GitHubIssueErrorCode.AUTH_FAILURE)
      );

      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService,
        repoService: createMockRepoService(),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      await expect(useCase.execute({ description: 'test', fix: true })).rejects.toThrow(
        'Authentication required'
      );
    });
  });

  // -----------------------------------------------------------------------
  // 7. Temp Directory Cleanup
  // -----------------------------------------------------------------------

  describe('temp directory cleanup', () => {
    it('should clean up temp directory on successful fix (no --workdir)', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/700', 700),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'test cleanup',
        fix: true,
        // No workdir — use temp
      });

      expect(result.cleanedUp).toBe(true);
    });

    it('should NOT clean up when --workdir is specified', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/701', 701),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'test no cleanup',
        fix: true,
        workdir: '/tmp/user-workdir',
      });

      expect(result.cleanedUp).toBe(false);
    });

    it('should clean up temp directory even when agent fails', async () => {
      const { provider, executor } = createMockAgentExecutorProvider({
        executeError: new Error('Agent crashed'),
      });
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/702', 702),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'test cleanup on failure',
        fix: true,
        // No workdir — use temp
      });

      expect(result.cleanedUp).toBe(true);
      expect(result.error).toContain('Agent crashed');
    });
  });

  // -----------------------------------------------------------------------
  // 8. Service Call Ordering
  // -----------------------------------------------------------------------

  describe('service call ordering and data flow', () => {
    it('should pass issue number from issue creation to branch name and PR', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/777', 777),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      await useCase.execute({
        description: 'test data flow',
        fix: true,
        workdir: '/tmp/data-flow-test',
      });

      // Branch name uses issue number
      expect(mocks.execFunction).toHaveBeenCalledWith(
        'git',
        ['checkout', '-b', 'doctor/fix-777'],
        expect.any(Object)
      );

      // PR title and body reference issue number
      const prArgs = vi.mocked(mocks.prService.createPrFromArgs).mock.calls[0][1];
      expect(prArgs.title).toContain('#777');
      expect(prArgs.body).toContain('#777');

      // Commit message references issue number
      expect(mocks.prService.commitAll).toHaveBeenCalledWith(
        expect.any(String),
        'fix: address issue #777 reported via shep doctor'
      );

      // Agent prompt references issue number
      const agentPrompt = vi.mocked(executor.execute).mock.calls[0][0];
      expect(agentPrompt).toContain('#777');
    });

    it('should pass failed run errors into both issue body and agent prompt', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([
          createFailedAgentRun('r1', {
            agentName: 'planner',
            error: 'ENOMEM: out of memory',
          }),
        ]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/888', 888),
        repoService: createMockRepoService({ hasPushAccess: true }),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      await useCase.execute({
        description: 'Out of memory issue',
        fix: true,
        workdir: '/tmp/error-flow-test',
      });

      // Issue body contains the error
      const issueBody = vi.mocked(mocks.issueService.createIssue).mock.calls[0][2];
      expect(issueBody).toContain('ENOMEM: out of memory');
      expect(issueBody).toContain('planner');

      // Agent prompt also contains the error context
      const agentPrompt = vi.mocked(executor.execute).mock.calls[0][0];
      expect(agentPrompt).toContain('ENOMEM: out of memory');
      expect(agentPrompt).toContain('planner');
    });
  });

  // -----------------------------------------------------------------------
  // 9. gh Version Collection Failure
  // -----------------------------------------------------------------------

  describe('gh version collection resilience', () => {
    it('should handle gh --version failure gracefully and use "unknown"', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const execFunction = createMockExecFunction();
      vi.mocked(execFunction).mockRejectedValue(new Error('gh: command not found'));

      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService('https://github.com/shep-ai/cli/issues/900', 900),
        repoService: createMockRepoService(),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction,
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'test gh version fallback',
        fix: false,
      });

      expect(result.diagnosticReport.systemInfo.ghVersion).toBe('unknown');
      // Issue was still created despite gh version failure
      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/900');
    });
  });

  // -----------------------------------------------------------------------
  // 10. Diagnostic Report Limits
  // -----------------------------------------------------------------------

  describe('diagnostic report limits', () => {
    it('should include at most 10 failed runs even with more available', async () => {
      const manyRuns = Array.from({ length: 20 }, (_, i) =>
        createFailedAgentRun(`run-${i}`, { error: `Error ${i}` })
      );
      const { provider, executor } = createMockAgentExecutorProvider();
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo(manyRuns),
        versionService: createMockVersionService(),
        issueService: createMockIssueService(),
        repoService: createMockRepoService(),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'many failures',
        fix: false,
      });

      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(10);
    });

    it('should truncate long issue titles to prevent GitHub API rejection', async () => {
      const { provider, executor } = createMockAgentExecutorProvider();
      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo([]),
        versionService: createMockVersionService(),
        issueService: createMockIssueService(),
        repoService: createMockRepoService(),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo: createMockFeatureRepo(),
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const longDescription =
        'This is a very long description that should be truncated when used in the issue title to prevent GitHub API from rejecting it';

      await useCase.execute({
        description: longDescription,
        fix: false,
      });

      const title = vi.mocked(mocks.issueService.createIssue).mock.calls[0][1];
      // Title format: "[shep doctor] <truncated-to-60-chars>..."
      // The prefix is 15 chars, so total should be reasonable
      expect(title.startsWith('[shep doctor] ')).toBe(true);
      expect(title.length).toBeLessThanOrEqual(80); // prefix + 60 + "..."
    });
  });

  // -----------------------------------------------------------------------
  // 11. Feature-Scoped Rich Diagnostics
  // -----------------------------------------------------------------------

  describe('feature-scoped rich diagnostics', () => {
    it('should produce enriched report with all feature context', async () => {
      const feature = {
        id: 'feat-rich',
        name: 'Rich Feature',
        specPath: '/nonexistent/specs/042-rich', // won't find files — that's OK (best-effort)
        lifecycle: 'Review',
        branch: 'feat/rich',
        description: 'Feature with full context',
        messages: [{ id: 'm1', role: 'user', content: 'Start' }],
        plan: { overview: 'Implement rich diagnostics', tasks: [] },
        fast: false,
        push: false,
        openPr: true,
        approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
      } as any;

      const { provider, executor } = createMockAgentExecutorProvider();
      const featureRepo = createMockFeatureRepo();
      vi.mocked(featureRepo.findById).mockResolvedValue(feature);

      const runs = [
        createFailedAgentRun('r1', {
          featureId: 'feat-rich',
          prompt: 'Do analysis',
          result: 'Done',
        }),
      ];

      const mocks: MockSet = {
        agentRunRepo: createMockAgentRunRepo(runs),
        versionService: createMockVersionService(),
        issueService: createMockIssueService(),
        repoService: createMockRepoService(),
        prService: createMockPrService(),
        agentExecutorProvider: provider,
        agentExecutor: executor,
        execFunction: createMockExecFunction(),
        featureRepo,
        phaseTimingRepo: createMockPhaseTimingRepo(),
      };
      const useCase = buildUseCase(mocks);

      const result = await useCase.execute({
        description: 'full context test',
        fix: false,
        featureId: 'feat-rich',
      });

      const report = result.diagnosticReport;
      expect(report.featureId).toBe('feat-rich');
      expect(report.featureLifecycle).toBe('Review');
      expect(report.featureBranch).toBe('feat/rich');
      expect(report.conversationMessages).toContain('Start');
      expect(report.featurePlan).toContain('rich diagnostics');
      expect(report.agentRunDetails).toHaveLength(1);
      expect(report.agentRunDetails![0].prompt).toBe('Do analysis');
      expect(report.featureWorkflowConfig).toContain('openPr');
    });
  });
});
