/**
 * GetCodeServerStatusUseCase Unit Tests
 *
 * Tests for querying code-server instance status by delegating to
 * ICodeServerManagerService.getStatus().
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetCodeServerStatusUseCase } from '@/application/use-cases/code-server/get-code-server-status.use-case.js';
import type { ICodeServerManagerService } from '@/application/ports/output/services/code-server-manager-service.interface.js';
import type { CodeServerInstance } from '@/domain/generated/output.js';
import { CodeServerInstanceStatus } from '@/domain/generated/output.js';

describe('GetCodeServerStatusUseCase', () => {
  let useCase: GetCodeServerStatusUseCase;
  let mockCodeServerManager: ICodeServerManagerService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCodeServerManager = {
      start: vi.fn(),
      stop: vi.fn(),
      getStatus: vi
        .fn<(featureId: string) => Promise<CodeServerInstance | null>>()
        .mockResolvedValue(null),
      listRunning: vi.fn(),
      stopAll: vi.fn(),
      reconcile: vi.fn(),
    };

    useCase = new GetCodeServerStatusUseCase(mockCodeServerManager);
  });

  it('should return running status with url and port when instance is running', async () => {
    const runningInstance: CodeServerInstance = {
      id: 'inst-1',
      featureId: 'feat-123',
      pid: 12345,
      port: 13370,
      worktreePath: '/mock/wt/feat/my-feature',
      status: CodeServerInstanceStatus.Running,
      startedAt: new Date(),
    };
    vi.mocked(mockCodeServerManager.getStatus).mockResolvedValue(runningInstance);

    const result = await useCase.execute({ featureId: 'feat-123' });

    expect(result).toEqual({
      status: 'running',
      url: 'http://127.0.0.1:13370',
      port: 13370,
    });
  });

  it('should return stopped status when instance is stopped', async () => {
    const stoppedInstance: CodeServerInstance = {
      id: 'inst-1',
      featureId: 'feat-123',
      pid: 12345,
      port: 13370,
      worktreePath: '/mock/wt/feat/my-feature',
      status: CodeServerInstanceStatus.Stopped,
      startedAt: new Date(),
      stoppedAt: new Date(),
    };
    vi.mocked(mockCodeServerManager.getStatus).mockResolvedValue(stoppedInstance);

    const result = await useCase.execute({ featureId: 'feat-123' });

    expect(result).toEqual({
      status: 'stopped',
    });
  });

  it('should return null when no instance exists for the feature', async () => {
    vi.mocked(mockCodeServerManager.getStatus).mockResolvedValue(null);

    const result = await useCase.execute({ featureId: 'feat-999' });

    expect(result).toBeNull();
  });

  it('should delegate to manager.getStatus() with the provided featureId', async () => {
    await useCase.execute({ featureId: 'feat-123' });

    expect(mockCodeServerManager.getStatus).toHaveBeenCalledWith('feat-123');
    expect(mockCodeServerManager.getStatus).toHaveBeenCalledTimes(1);
  });
});
