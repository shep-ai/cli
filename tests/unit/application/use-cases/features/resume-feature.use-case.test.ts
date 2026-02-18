/**
 * ResumeFeatureUseCase Unit Tests
 *
 * Tests for resuming interrupted/failed feature agent runs.
 *
 * TDD Phase: RED
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeFeatureUseCase } from '@/application/use-cases/features/resume-feature.use-case.js';
import { AgentRunStatus, SdlcLifecycle } from '@/domain/generated/output.js';
import type { AgentRun, Feature } from '@/domain/generated/output.js';

function createMockFeatureRepo() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdPrefix: vi.fn(),
    findBySlug: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockRunRepo() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByThreadId: vi.fn(),
    updateStatus: vi.fn(),
    findRunningByPid: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockProcessService() {
  return {
    spawn: vi.fn().mockReturnValue(12345),
    isAlive: vi.fn(),
    checkAndMarkCrashed: vi.fn(),
  };
}

function createMockWorktreeService() {
  return {
    create: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
    exists: vi.fn(),
    getWorktreePath: vi.fn().mockReturnValue('/wt/path'),
  };
}

function createTestFeature(overrides?: Partial<Feature>): Feature {
  return {
    id: 'feat-001',
    name: 'Test feature',
    slug: 'test-feature',
    description: 'Test',
    repositoryPath: '/test/repo',
    branch: 'feat/test-feature',
    lifecycle: SdlcLifecycle.Implementation,
    messages: [],
    relatedArtifacts: [],
    push: false,
    openPr: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    agentRunId: 'run-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestRun(overrides?: Partial<AgentRun>): AgentRun {
  return {
    id: 'run-001',
    agentType: 'claude-code' as any,
    agentName: 'feature-agent',
    status: AgentRunStatus.interrupted,
    prompt: 'Test',
    threadId: 'thread-001',
    featureId: 'feat-001',
    repositoryPath: '/test/repo',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ResumeFeatureUseCase', () => {
  let useCase: ResumeFeatureUseCase;
  let featureRepo: ReturnType<typeof createMockFeatureRepo>;
  let runRepo: ReturnType<typeof createMockRunRepo>;
  let processService: ReturnType<typeof createMockProcessService>;
  let worktreeService: ReturnType<typeof createMockWorktreeService>;

  beforeEach(() => {
    featureRepo = createMockFeatureRepo();
    runRepo = createMockRunRepo();
    processService = createMockProcessService();
    worktreeService = createMockWorktreeService();
    useCase = new ResumeFeatureUseCase(
      featureRepo as any,
      runRepo as any,
      processService as any,
      worktreeService as any
    );
  });

  it('should resume an interrupted run', async () => {
    featureRepo.findById.mockResolvedValue(createTestFeature());
    runRepo.findById.mockResolvedValue(createTestRun({ status: AgentRunStatus.interrupted }));

    const result = await useCase.execute('feat-001');

    expect(result.feature.id).toBe('feat-001');
    expect(runRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'feature-agent',
        status: AgentRunStatus.pending,
        threadId: 'thread-001', // same threadId
        featureId: 'feat-001',
      })
    );
    expect(processService.spawn).toHaveBeenCalledWith(
      'feat-001',
      expect.any(String), // new run ID
      '/test/repo',
      '/wt/path',
      '/wt/path',
      expect.objectContaining({
        resume: true,
        threadId: 'thread-001',
        resumeFromInterrupt: false, // interrupted !== waitingApproval
      })
    );
  });

  it('should resume a failed run without resumeFromInterrupt', async () => {
    featureRepo.findById.mockResolvedValue(createTestFeature());
    runRepo.findById.mockResolvedValue(createTestRun({ status: AgentRunStatus.failed }));

    const result = await useCase.execute('feat-001');

    expect(result.feature.id).toBe('feat-001');
    expect(processService.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        resume: true,
        threadId: 'thread-001',
        resumeFromInterrupt: false,
      })
    );
  });

  it('should resume a waiting_approval run with resumeFromInterrupt', async () => {
    featureRepo.findById.mockResolvedValue(createTestFeature());
    runRepo.findById.mockResolvedValue(createTestRun({ status: AgentRunStatus.waitingApproval }));

    const result = await useCase.execute('feat-001');

    expect(result.feature.id).toBe('feat-001');
    expect(processService.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        resume: true,
        threadId: 'thread-001',
        resumeFromInterrupt: true,
      })
    );
  });

  it('should resolve feature by ID prefix', async () => {
    featureRepo.findById.mockResolvedValue(null);
    featureRepo.findByIdPrefix.mockResolvedValue(createTestFeature());
    runRepo.findById.mockResolvedValue(createTestRun());

    const result = await useCase.execute('feat-0');

    expect(result.feature.id).toBe('feat-001');
    expect(featureRepo.findByIdPrefix).toHaveBeenCalledWith('feat-0');
  });

  it('should throw when feature not found', async () => {
    featureRepo.findById.mockResolvedValue(null);
    featureRepo.findByIdPrefix.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(/not found/i);
  });

  it('should throw when no prior agent run exists', async () => {
    featureRepo.findById.mockResolvedValue(createTestFeature({ agentRunId: undefined }));

    await expect(useCase.execute('feat-001')).rejects.toThrow(/no agent run/i);
  });

  it('should throw when agent run is still running', async () => {
    featureRepo.findById.mockResolvedValue(createTestFeature());
    runRepo.findById.mockResolvedValue(createTestRun({ status: AgentRunStatus.running }));

    await expect(useCase.execute('feat-001')).rejects.toThrow(/still running/i);
  });

  it('should throw when agent run already completed', async () => {
    featureRepo.findById.mockResolvedValue(createTestFeature());
    runRepo.findById.mockResolvedValue(createTestRun({ status: AgentRunStatus.completed }));

    await expect(useCase.execute('feat-001')).rejects.toThrow(/already completed/i);
  });

  it('should pass workflow flags from feature entity to spawn', async () => {
    featureRepo.findById.mockResolvedValue(createTestFeature({ openPr: true }));
    runRepo.findById.mockResolvedValue(createTestRun({ status: AgentRunStatus.failed }));

    await useCase.execute('feat-001');

    expect(processService.spawn).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        openPr: true,
      })
    );
  });
});
