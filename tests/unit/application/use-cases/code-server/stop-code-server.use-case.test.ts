/**
 * StopCodeServerUseCase Unit Tests
 *
 * Tests for stopping a code-server instance by delegating to
 * ICodeServerManagerService.stop().
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StopCodeServerUseCase } from '@/application/use-cases/code-server/stop-code-server.use-case.js';
import type { ICodeServerManagerService } from '@/application/ports/output/services/code-server-manager-service.interface.js';

describe('StopCodeServerUseCase', () => {
  let useCase: StopCodeServerUseCase;
  let mockCodeServerManager: ICodeServerManagerService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCodeServerManager = {
      start: vi.fn(),
      stop: vi.fn<(featureId: string) => Promise<void>>().mockResolvedValue(undefined),
      getStatus: vi.fn(),
      listRunning: vi.fn(),
      stopAll: vi.fn(),
      reconcile: vi.fn(),
    };

    useCase = new StopCodeServerUseCase(mockCodeServerManager);
  });

  it('should delegate to manager.stop() with the provided featureId', async () => {
    await useCase.execute({ featureId: 'feat-456' });

    expect(mockCodeServerManager.stop).toHaveBeenCalledWith('feat-456');
    expect(mockCodeServerManager.stop).toHaveBeenCalledTimes(1);
  });

  it('should return void on success', async () => {
    const result = await useCase.execute({ featureId: 'feat-456' });

    expect(result).toBeUndefined();
  });

  it('should propagate errors from the manager service', async () => {
    vi.mocked(mockCodeServerManager.stop).mockRejectedValue(new Error('Failed to stop instance'));

    await expect(useCase.execute({ featureId: 'feat-456' })).rejects.toThrow(
      'Failed to stop instance'
    );
  });
});
