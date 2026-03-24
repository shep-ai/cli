/**
 * DoctorDiagnoseUseCase Unit Tests
 *
 * Tests for the doctor diagnose use case covering:
 * - Diagnostic collection (agent runs, version, system info)
 * - Issue creation with formatted body
 * - Maintainer flow (direct push)
 * - Contributor flow (fork + cross-fork PR)
 * - No-fix flow (issue only)
 * - Graceful degradation on failures
 * - Temp directory cleanup
 *
 * TDD Phase: RED-GREEN-REFACTOR
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

vi.mock('node:fs/promises', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  };
});

import { readFile } from 'node:fs/promises';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockAgentRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-1',
    agentType: AgentType.ClaudeCode,
    agentName: 'analyze-repository',
    status: AgentRunStatus.completed,
    prompt: 'Analyze this repo',
    threadId: 'thread-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

function createFailedRun(id: string, overrides?: Partial<AgentRun>): AgentRun {
  return createMockAgentRun({
    id,
    status: AgentRunStatus.failed,
    error: `Error in run ${id}`,
    agentName: `agent-${id}`,
    ...overrides,
  });
}

function createMocks() {
  const agentRunRepo: IAgentRunRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    findByThreadId: vi.fn(),
    updateStatus: vi.fn(),
    findRunningByPid: vi.fn(),
    list: vi.fn<() => Promise<AgentRun[]>>().mockResolvedValue([]),
    delete: vi.fn(),
  };

  const versionService: IVersionService = {
    getVersion: vi.fn().mockReturnValue({
      name: '@shepai/cli',
      version: '1.5.0',
      description: 'Autonomous AI Native SDLC Platform',
    }),
  };

  const issueService: IGitHubIssueService = {
    createIssue: vi.fn().mockResolvedValue({
      url: 'https://github.com/shep-ai/cli/issues/42',
      number: 42,
    }),
  };

  const repoService: IGitHubRepositoryService = {
    checkAuth: vi.fn().mockResolvedValue(undefined),
    cloneRepository: vi.fn().mockResolvedValue(undefined),
    listUserRepositories: vi.fn().mockResolvedValue([]),
    parseGitHubUrl: vi.fn(),
    checkPushAccess: vi.fn().mockResolvedValue(false),
    forkRepository: vi.fn().mockResolvedValue({
      nameWithOwner: 'user/cli',
      cloneUrl: 'https://github.com/user/cli.git',
    }),
  };

  const prService: IGitPrService = {
    hasRemote: vi.fn().mockResolvedValue(true),
    getRemoteUrl: vi.fn().mockResolvedValue(null),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    revParse: vi.fn().mockResolvedValue('abc123'),
    hasUncommittedChanges: vi.fn().mockResolvedValue(true),
    commitAll: vi.fn().mockResolvedValue('commit-sha'),
    push: vi.fn().mockResolvedValue(undefined),
    createPr: vi
      .fn()
      .mockResolvedValue({ url: 'https://github.com/shep-ai/cli/pull/1', number: 1 }),
    createPrFromArgs: vi.fn().mockResolvedValue({
      url: 'https://github.com/shep-ai/cli/pull/99',
      number: 99,
    }),
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

  const mockExecutor: IAgentExecutor = {
    agentType: AgentType.ClaudeCode,
    execute: vi.fn().mockResolvedValue({ result: 'Fix applied', sessionId: 's1' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };

  const agentExecutorProvider: IAgentExecutorProvider = {
    getExecutor: vi.fn().mockResolvedValue(mockExecutor),
  };

  const execFunction: ExecFunction = vi
    .fn()
    .mockResolvedValue({ stdout: 'gh version 2.40.0\n', stderr: '' });

  const featureRepo: IFeatureRepository = {
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

  const phaseTimingRepo: Pick<IPhaseTimingRepository, 'findByFeatureId'> = {
    findByFeatureId: vi.fn<(featureId: string) => Promise<PhaseTiming[]>>().mockResolvedValue([]),
  };

  return {
    agentRunRepo,
    versionService,
    issueService,
    repoService,
    prService,
    agentExecutorProvider,
    execFunction,
    mockExecutor,
    featureRepo,
    phaseTimingRepo,
  };
}

function createUseCase(mocks: ReturnType<typeof createMocks>) {
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
// Tests: Task 10 — Diagnostic Collection
// ---------------------------------------------------------------------------

describe('DoctorDiagnoseUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: DoctorDiagnoseUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = createUseCase(mocks);
  });

  describe('diagnostic collection', () => {
    it('should return diagnostic report with failed agent runs from repository', async () => {
      const failedRun = createFailedRun('r1');
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue([failedRun]);

      const result = await useCase.execute({
        description: 'Something broke',
        fix: false,
      });

      expect(result.diagnosticReport).toBeDefined();
      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(1);
      expect(result.diagnosticReport.failedRunSummaries[0].agentType).toBe(AgentType.ClaudeCode);
      expect(result.diagnosticReport.failedRunSummaries[0].error).toBe('Error in run r1');
    });

    it('should only include failed/errored runs (running/completed excluded)', async () => {
      const runs: AgentRun[] = [
        createMockAgentRun({ id: '1', status: AgentRunStatus.completed }),
        createMockAgentRun({ id: '2', status: AgentRunStatus.running }),
        createFailedRun('3'),
        createMockAgentRun({
          id: '4',
          status: AgentRunStatus.interrupted,
          error: 'Interrupted',
          agentName: 'agent-4',
        }),
        createMockAgentRun({ id: '5', status: AgentRunStatus.pending }),
        createMockAgentRun({
          id: '6',
          status: AgentRunStatus.cancelled,
          error: 'Cancelled',
          agentName: 'agent-6',
        }),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      // Only failed status should be included
      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(1);
      expect(result.diagnosticReport.failedRunSummaries[0].agentName).toBe('agent-3');
    });

    it('should include at most 10 runs even if more exist', async () => {
      const runs: AgentRun[] = Array.from({ length: 15 }, (_, i) => createFailedRun(`r${i}`));
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(10);
    });

    it('should exclude prompt and result fields from run summaries', async () => {
      const run = createFailedRun('r1', {
        prompt: 'SECRET PROMPT DATA',
        result: 'SECRET RESULT DATA',
      });
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue([run]);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      const summary = result.diagnosticReport.failedRunSummaries[0];
      expect(summary).not.toHaveProperty('prompt');
      expect(summary).not.toHaveProperty('result');
      expect(JSON.stringify(summary)).not.toContain('SECRET PROMPT DATA');
      expect(JSON.stringify(summary)).not.toContain('SECRET RESULT DATA');
    });

    it('should include CLI version and system info in report', async () => {
      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      expect(result.diagnosticReport.cliVersion).toBe('1.5.0');
      expect(result.diagnosticReport.systemInfo.nodeVersion).toBe(process.version);
      expect(result.diagnosticReport.systemInfo.platform).toBe(process.platform);
      expect(result.diagnosticReport.systemInfo.arch).toBe(process.arch);
      expect(result.diagnosticReport.systemInfo.ghVersion).toContain('gh version');
    });

    it('should include user description in the diagnostic report', async () => {
      const result = await useCase.execute({
        description: 'Agent crashed during planning phase',
        fix: false,
      });

      expect(result.diagnosticReport.userDescription).toBe('Agent crashed during planning phase');
    });

    it('should handle gh version check failure gracefully', async () => {
      vi.mocked(mocks.execFunction).mockRejectedValue(new Error('gh not found'));

      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      expect(result.diagnosticReport.systemInfo.ghVersion).toBe('unknown');
    });
  });

  // -------------------------------------------------------------------------
  // Tests: Task 11 — Issue Creation & Fix Workflow
  // -------------------------------------------------------------------------

  describe('issue creation', () => {
    it('should create issue with formatted body and return issueUrl', async () => {
      const result = await useCase.execute({
        description: 'The agent keeps crashing',
        fix: false,
      });

      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/42');
      expect(mocks.issueService.createIssue).toHaveBeenCalledWith(
        'shep-ai/cli',
        expect.stringContaining('[shep doctor]'),
        expect.stringContaining('The agent keeps crashing'),
        ['bug', 'shep-doctor']
      );
    });

    it('should include [shep doctor] prefix in issue title', async () => {
      await useCase.execute({
        description: 'Memory leak in settings service',
        fix: false,
      });

      const titleArg = vi.mocked(mocks.issueService.createIssue).mock.calls[0][1];
      expect(titleArg).toMatch(/^\[shep doctor\]/);
    });

    it('should include diagnostic context in issue body', async () => {
      const failedRun = createFailedRun('r1');
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue([failedRun]);

      await useCase.execute({
        description: 'Something broke',
        fix: false,
      });

      const bodyArg = vi.mocked(mocks.issueService.createIssue).mock.calls[0][2];
      expect(bodyArg).toContain('Something broke');
      expect(bodyArg).toContain('1.5.0');
      expect(bodyArg).toContain('shep doctor');
    });

    it('should include footer tag in issue body', async () => {
      await useCase.execute({
        description: 'test',
        fix: false,
      });

      const bodyArg = vi.mocked(mocks.issueService.createIssue).mock.calls[0][2];
      expect(bodyArg).toContain('Reported via `shep doctor`');
    });
  });

  describe('no-fix flow', () => {
    it('should skip entire fix workflow and return only issueUrl', async () => {
      const result = await useCase.execute({
        description: 'test',
        fix: false,
      });

      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/42');
      expect(result.prUrl).toBeUndefined();
      expect(mocks.repoService.checkPushAccess).not.toHaveBeenCalled();
      expect(mocks.repoService.cloneRepository).not.toHaveBeenCalled();
      expect(mocks.agentExecutorProvider.getExecutor).not.toHaveBeenCalled();
    });
  });

  describe('maintainer flow (has push access)', () => {
    beforeEach(() => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);
    });

    it('should clone directly, push, and create same-repo PR', async () => {
      const result = await useCase.execute({
        description: 'test fix',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      // Should check push access
      expect(mocks.repoService.checkPushAccess).toHaveBeenCalledWith('shep-ai/cli');

      // Should NOT fork
      expect(mocks.repoService.forkRepository).not.toHaveBeenCalled();

      // Should clone shep-ai/cli directly
      expect(mocks.repoService.cloneRepository).toHaveBeenCalledWith(
        'shep-ai/cli',
        expect.stringContaining('/tmp/test-workdir'),
        undefined
      );

      // Should invoke the agent
      expect(mocks.agentExecutorProvider.getExecutor).toHaveBeenCalled();

      // PR should NOT have cross-fork --repo flag
      const prArgs = vi.mocked(mocks.prService.createPrFromArgs).mock.calls[0][1];
      expect(prArgs.repo).toBeUndefined();

      expect(result.prUrl).toBe('https://github.com/shep-ai/cli/pull/99');
      expect(result.flowType).toBe('maintainer');
    });

    it('should create branch named doctor/fix-<issue-number>', async () => {
      await useCase.execute({
        description: 'test',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      // Check that the exec function was called with git checkout -b doctor/fix-42
      expect(mocks.execFunction).toHaveBeenCalledWith(
        'git',
        ['checkout', '-b', 'doctor/fix-42'],
        expect.objectContaining({ cwd: expect.any(String) })
      );
    });
  });

  describe('contributor flow (no push access)', () => {
    beforeEach(() => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(false);
    });

    it('should fork, clone fork, and create cross-fork PR with --repo', async () => {
      const result = await useCase.execute({
        description: 'test fix',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      // Should check push access
      expect(mocks.repoService.checkPushAccess).toHaveBeenCalledWith('shep-ai/cli');

      // Should fork
      expect(mocks.repoService.forkRepository).toHaveBeenCalledWith('shep-ai/cli');

      // Should clone the fork (not shep-ai/cli directly)
      expect(mocks.repoService.cloneRepository).toHaveBeenCalledWith(
        'user/cli',
        expect.any(String),
        undefined
      );

      // PR should have cross-fork --repo flag
      const prArgs = vi.mocked(mocks.prService.createPrFromArgs).mock.calls[0][1];
      expect(prArgs.repo).toBe('shep-ai/cli');

      expect(result.prUrl).toBe('https://github.com/shep-ai/cli/pull/99');
      expect(result.flowType).toBe('contributor');
    });
  });

  describe('agent invocation', () => {
    it('should invoke agent with structured prompt containing issue context', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);

      await useCase.execute({
        description: 'Agent crashed during planning',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      const prompt = vi.mocked(mocks.mockExecutor.execute).mock.calls[0][0];
      expect(prompt).toContain('Agent crashed during planning');
      expect(prompt).toContain('#42');
    });

    it('should pass cwd option pointing to cloned directory', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);

      await useCase.execute({
        description: 'test',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      const options = vi.mocked(mocks.mockExecutor.execute).mock.calls[0][1];
      expect(options?.cwd).toContain('/tmp/test-workdir');
    });
  });

  describe('graceful degradation', () => {
    it('should return issueUrl with prUrl undefined when agent fails', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);
      vi.mocked(mocks.mockExecutor.execute).mockRejectedValue(new Error('Agent crashed'));

      const result = await useCase.execute({
        description: 'test',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      expect(result.issueUrl).toBe('https://github.com/shep-ai/cli/issues/42');
      expect(result.prUrl).toBeUndefined();
      expect(result.error).toContain('Agent crashed');
    });

    it('should fall back to contributor flow when push access check fails', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockRejectedValue(new Error('Network error'));

      const result = await useCase.execute({
        description: 'test',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      // Should fall back to fork flow
      expect(mocks.repoService.forkRepository).toHaveBeenCalled();
      expect(result.flowType).toBe('contributor');
    });

    it('should handle no uncommitted changes after agent run', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);
      vi.mocked(mocks.prService.hasUncommittedChanges).mockResolvedValue(false);

      const result = await useCase.execute({
        description: 'test',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      // No changes = no PR
      expect(mocks.prService.commitAll).not.toHaveBeenCalled();
      expect(result.prUrl).toBeUndefined();
      expect(result.error).toContain('no changes');
    });
  });

  describe('temp directory cleanup', () => {
    it('should clean up temp directory on success when no workdir specified', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);

      const result = await useCase.execute({
        description: 'test',
        fix: true,
      });

      // Verify cleanup happened (the use case calls fs.rm on the temp dir)
      expect(result.cleanedUp).toBe(true);
    });

    it('should clean up temp directory on failure when no workdir specified', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);
      vi.mocked(mocks.mockExecutor.execute).mockRejectedValue(new Error('Agent crashed'));

      const result = await useCase.execute({
        description: 'test',
        fix: true,
      });

      expect(result.cleanedUp).toBe(true);
    });

    it('should NOT clean up when workdir is specified', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);

      const result = await useCase.execute({
        description: 'test',
        fix: true,
        workdir: '/tmp/user-specified',
      });

      expect(result.cleanedUp).toBe(false);
    });
  });

  describe('PR creation details', () => {
    it('should reference issue in PR title and body', async () => {
      vi.mocked(mocks.repoService.checkPushAccess).mockResolvedValue(true);

      await useCase.execute({
        description: 'test',
        fix: true,
        workdir: '/tmp/test-workdir',
      });

      const prArgs = vi.mocked(mocks.prService.createPrFromArgs).mock.calls[0][1];
      expect(prArgs.title).toContain('#42');
      expect(prArgs.body).toContain('#42');
      expect(prArgs.base).toBe('main');
      expect(prArgs.labels).toContain('shep-doctor');
    });
  });

  describe('feature-specific diagnostics', () => {
    it('should filter failed runs by featureId when provided', async () => {
      const runs: AgentRun[] = [
        createFailedRun('r1', { featureId: 'feat-abc' }),
        createFailedRun('r2', { featureId: 'feat-xyz' }),
        createFailedRun('r3', { featureId: 'feat-abc' }),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
      } as any);

      const result = await useCase.execute({
        description: 'feature broke',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(2);
      expect(result.diagnosticReport.featureId).toBe('feat-abc');
      expect(result.diagnosticReport.featureName).toBe('My Feature');
    });

    it('should resolve feature by ID prefix when findById returns null', async () => {
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue(null);
      vi.mocked(mocks.featureRepo.findByIdPrefix).mockResolvedValue({
        id: 'feat-abc-full-id',
        name: 'Prefixed Feature',
      } as any);

      const failedRun = createFailedRun('r1', { featureId: 'feat-abc-full-id' });
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue([failedRun]);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(mocks.featureRepo.findById).toHaveBeenCalledWith('feat-abc');
      expect(mocks.featureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-abc');
      expect(result.diagnosticReport.featureId).toBe('feat-abc-full-id');
      expect(result.diagnosticReport.featureName).toBe('Prefixed Feature');
    });

    it('should return all failed runs when featureId is not provided', async () => {
      const runs: AgentRun[] = [
        createFailedRun('r1', { featureId: 'feat-abc' }),
        createFailedRun('r2', { featureId: 'feat-xyz' }),
        createFailedRun('r3'),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);

      const result = await useCase.execute({
        description: 'general issue',
        fix: false,
      });

      expect(result.diagnosticReport.failedRunSummaries).toHaveLength(3);
      expect(result.diagnosticReport.featureId).toBeUndefined();
      expect(result.diagnosticReport.featureName).toBeUndefined();
    });

    it('should not set featureId in report when feature is not found', async () => {
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue(null);
      vi.mocked(mocks.featureRepo.findByIdPrefix).mockResolvedValue(null);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'nonexistent',
      });

      expect(result.diagnosticReport.featureId).toBeUndefined();
      expect(result.diagnosticReport.featureName).toBeUndefined();
    });

    it('should include feature context in issue body when featureId is provided', async () => {
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-123',
        name: 'Auth Feature',
      } as any);

      await useCase.execute({
        description: 'auth broke',
        fix: false,
        featureId: 'feat-123',
      });

      const bodyArg = vi.mocked(mocks.issueService.createIssue).mock.calls[0][2];
      expect(bodyArg).toContain('Feature ID');
      expect(bodyArg).toContain('feat-123');
      expect(bodyArg).toContain('Auth Feature');
    });

    it('should collect spec YAML files when feature has specPath', async () => {
      vi.mocked(readFile).mockImplementation(async (filePath: any) => {
        const p = String(filePath);
        if (p.endsWith('spec.yaml')) return 'name: My Feature Spec';
        if (p.endsWith('research.yaml')) return 'decisions: []';
        if (p.endsWith('plan.yaml')) return 'phases: []';
        if (p.endsWith('tasks.yaml')) return 'tasks: []';
        if (p.endsWith('feature.yaml')) return 'status: active';
        throw new Error('ENOENT');
      });

      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        specPath: '/repo/specs/042-my-feature',
        lifecycle: 'Implementation',
        branch: 'feat/my-feature',
        description: 'A test feature',
        messages: [],
        fast: false,
        push: false,
        openPr: false,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.specYaml).toBe('name: My Feature Spec');
      expect(result.diagnosticReport.researchYaml).toBe('decisions: []');
      expect(result.diagnosticReport.planYaml).toBe('phases: []');
      expect(result.diagnosticReport.tasksYaml).toBe('tasks: []');
      expect(result.diagnosticReport.featureStatusYaml).toBe('status: active');
      expect(result.diagnosticReport.featureLifecycle).toBe('Implementation');
      expect(result.diagnosticReport.featureBranch).toBe('feat/my-feature');
      expect(result.diagnosticReport.featureDescription).toBe('A test feature');
    });

    it('should collect worker logs for all feature-scoped agent runs', async () => {
      vi.mocked(readFile).mockImplementation(async (filePath: any) => {
        const p = String(filePath);
        if (p.includes('worker-r1.log')) return 'Log content for r1';
        if (p.includes('worker-r2.log')) return 'Log content for r2';
        throw new Error('ENOENT');
      });

      const runs: AgentRun[] = [
        createFailedRun('r1', { featureId: 'feat-abc' }),
        createFailedRun('r2', { featureId: 'feat-abc' }),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.workerLogs).toBeDefined();
      expect(result.diagnosticReport.workerLogs).toHaveLength(2);
      expect(result.diagnosticReport.workerLogs![0].content).toBe('Log content for r1');
      expect(result.diagnosticReport.workerLogs![1].agentRunId).toBe('r2');
    });

    it('should collect agent run details with prompts and results for feature-scoped runs', async () => {
      const runs: AgentRun[] = [
        createFailedRun('r1', {
          featureId: 'feat-abc',
          prompt: 'Analyze this',
          result: 'Analysis done',
        }),
        {
          ...createFailedRun('r2', { featureId: 'feat-abc', prompt: 'Plan this' }),
          status: AgentRunStatus.completed,
        },
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.agentRunDetails).toBeDefined();
      expect(result.diagnosticReport.agentRunDetails!.length).toBe(2);
      expect(result.diagnosticReport.agentRunDetails![0].prompt).toBe('Analyze this');
    });

    it('should collect phase timings when feature is resolved', async () => {
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);
      vi.mocked(mocks.phaseTimingRepo.findByFeatureId).mockResolvedValue([
        { id: 'pt-1', phaseName: 'analyze', durationMs: 5000 } as any,
      ]);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.phaseTimings).toBeDefined();
      expect(result.diagnosticReport.phaseTimings).toContain('analyze');
    });

    it('should include conversation messages and feature plan in report', async () => {
      const messages = [{ id: 'm1', role: 'user', content: 'Hello' }];
      const plan = { overview: 'Build X', tasks: [] };
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages,
        plan,
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.conversationMessages).toContain('Hello');
      expect(result.diagnosticReport.featurePlan).toContain('Build X');
    });

    it('should leave all enriched fields undefined when no featureId is provided', async () => {
      const result = await useCase.execute({
        description: 'general issue',
        fix: false,
      });

      expect(result.diagnosticReport.featureLifecycle).toBeUndefined();
      expect(result.diagnosticReport.featureBranch).toBeUndefined();
      expect(result.diagnosticReport.featureDescription).toBeUndefined();
      expect(result.diagnosticReport.featureWorkflowConfig).toBeUndefined();
      expect(result.diagnosticReport.specYaml).toBeUndefined();
      expect(result.diagnosticReport.researchYaml).toBeUndefined();
      expect(result.diagnosticReport.planYaml).toBeUndefined();
      expect(result.diagnosticReport.tasksYaml).toBeUndefined();
      expect(result.diagnosticReport.featureStatusYaml).toBeUndefined();
      expect(result.diagnosticReport.agentRunDetails).toBeUndefined();
      expect(result.diagnosticReport.conversationMessages).toBeUndefined();
      expect(result.diagnosticReport.featurePlan).toBeUndefined();
      expect(result.diagnosticReport.workerLogs).toBeUndefined();
      expect(result.diagnosticReport.phaseTimings).toBeUndefined();
    });

    it('should include enriched sections with details tags in issue body', async () => {
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        specPath: '/repo/specs/042-my-feature',
        lifecycle: 'Implementation',
        branch: 'feat/my-feature',
        description: 'A test feature',
        messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
        plan: { overview: 'Plan overview' },
        fast: false,
        push: true,
        openPr: false,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      } as any);

      await useCase.execute({
        description: 'enriched test',
        fix: false,
        featureId: 'feat-abc',
      });

      const bodyArg = vi.mocked(mocks.issueService.createIssue).mock.calls[0][2];
      // Feature context
      expect(bodyArg).toContain('Lifecycle');
      expect(bodyArg).toContain('Implementation');
      // Details tags for large sections
      expect(bodyArg).toContain('<details>');
      expect(bodyArg).toContain('Conversation');
      expect(bodyArg).toContain('Plan');
    });

    it('should truncate agent run prompts exceeding MAX_PROMPT_CHARS', async () => {
      const longPrompt = 'x'.repeat(15_000);
      const runs: AgentRun[] = [
        createFailedRun('r1', { featureId: 'feat-abc', prompt: longPrompt }),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      const detail = result.diagnosticReport.agentRunDetails![0];
      expect(detail.prompt.length).toBeLessThanOrEqual(10_100); // 10000 + truncation message
      expect(detail.prompt).toContain('[truncated');
    });
  });
});
