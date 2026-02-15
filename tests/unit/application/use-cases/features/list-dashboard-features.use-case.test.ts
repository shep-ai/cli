/**
 * ListDashboardFeaturesUseCase Unit Tests
 *
 * Tests for listing features with agent run data for dashboard display.
 * Uses mock repository.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListDashboardFeaturesUseCase } from '../../../../../src/application/use-cases/features/list-dashboard-features.use-case.js';
import type {
  IFeatureRepository,
  DashboardFeature,
} from '../../../../../src/application/ports/output/repositories/feature-repository.interface.js';
import { SdlcLifecycle } from '../../../../../src/domain/generated/output.js';

describe('ListDashboardFeaturesUseCase', () => {
  let useCase: ListDashboardFeaturesUseCase;
  let mockRepo: IFeatureRepository;

  const mockDashboardFeatures: DashboardFeature[] = [
    {
      id: 'feat-1',
      name: 'Feature One',
      slug: 'feature-one',
      description: 'First feature',
      repositoryPath: '/repo/path',
      branch: 'main',
      lifecycle: 'Implementation',
      agentStatus: 'running',
      agentType: 'claude-code',
    },
    {
      id: 'feat-2',
      name: 'Feature Two',
      slug: 'feature-two',
      description: 'Second feature',
      repositoryPath: '/repo/path',
      branch: 'main',
      lifecycle: 'Maintain',
      agentStatus: 'completed',
      agentResult: 'node:implement',
    },
  ];

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdPrefix: vi.fn(),
      findBySlug: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      listWithAgentRuns: vi.fn().mockResolvedValue(mockDashboardFeatures),
      update: vi.fn(),
      delete: vi.fn(),
    };
    useCase = new ListDashboardFeaturesUseCase(mockRepo);
  });

  it('should return dashboard features with agent run data', async () => {
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
    expect(result[0].agentStatus).toBe('running');
    expect(result[0].agentType).toBe('claude-code');
    expect(result[1].agentStatus).toBe('completed');
    expect(result[1].agentResult).toBe('node:implement');
    expect(mockRepo.listWithAgentRuns).toHaveBeenCalledWith(undefined);
  });

  it('should pass repository path filter', async () => {
    await useCase.execute({ repositoryPath: '/repo' });
    expect(mockRepo.listWithAgentRuns).toHaveBeenCalledWith({
      repositoryPath: '/repo',
    });
  });

  it('should pass lifecycle filter', async () => {
    await useCase.execute({ lifecycle: SdlcLifecycle.Implementation });
    expect(mockRepo.listWithAgentRuns).toHaveBeenCalledWith({
      lifecycle: SdlcLifecycle.Implementation,
    });
  });

  it('should return empty array when no features found', async () => {
    mockRepo.listWithAgentRuns = vi.fn().mockResolvedValue([]);
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });

  it('should pass combined filters', async () => {
    await useCase.execute({
      repositoryPath: '/repo',
      lifecycle: SdlcLifecycle.Review,
    });
    expect(mockRepo.listWithAgentRuns).toHaveBeenCalledWith({
      repositoryPath: '/repo',
      lifecycle: SdlcLifecycle.Review,
    });
  });

  it('should return features without agent data when agent_run is null', async () => {
    const featureWithoutAgent: DashboardFeature = {
      id: 'feat-3',
      name: 'No Agent',
      slug: 'no-agent',
      description: 'Feature without agent run',
      repositoryPath: '/repo',
      branch: 'main',
      lifecycle: 'Requirements',
    };
    mockRepo.listWithAgentRuns = vi.fn().mockResolvedValue([featureWithoutAgent]);
    const result = await useCase.execute();
    expect(result[0].agentStatus).toBeUndefined();
    expect(result[0].agentType).toBeUndefined();
    expect(result[0].agentError).toBeUndefined();
  });
});
