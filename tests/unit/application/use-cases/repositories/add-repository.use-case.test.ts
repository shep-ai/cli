import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddRepositoryUseCase } from '@/application/use-cases/repositories/add-repository.use-case.js';
import type { IRepositoryRepository } from '@/application/ports/output/repositories/repository-repository.interface.js';
import type { Repository } from '@/domain/generated/output.js';

function createMockRepo(): IRepositoryRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(null),
    findByPath: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue([]),
    remove: vi.fn(),
    softDelete: vi.fn(),
    findByPathIncludingDeleted: vi.fn().mockResolvedValue(null),
    restore: vi.fn(),
  };
}

describe('AddRepositoryUseCase', () => {
  let useCase: AddRepositoryUseCase;
  let mockRepo: IRepositoryRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    useCase = new AddRepositoryUseCase(mockRepo);
  });

  it('should create a new repository with normalized path', async () => {
    const result = await useCase.execute({ path: '/Users/test/my-project/' });

    expect(mockRepo.findByPath).toHaveBeenCalledWith('/Users/test/my-project');
    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/Users/test/my-project',
        name: 'my-project',
      })
    );
    expect(result.path).toBe('/Users/test/my-project');
    expect(result.name).toBe('my-project');
    expect(result.id).toBeDefined();
  });

  it('should return existing repository for duplicate path', async () => {
    const existing: Repository = {
      id: 'existing-id',
      name: 'my-project',
      path: '/Users/test/my-project',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(mockRepo.findByPath).mockResolvedValue(existing);

    const result = await useCase.execute({ path: '/Users/test/my-project' });

    expect(result.id).toBe('existing-id');
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('should strip trailing slashes from path', async () => {
    await useCase.execute({ path: '/repos/test///' });

    expect(mockRepo.findByPath).toHaveBeenCalledWith('/repos/test');
  });

  it('should use custom name when provided', async () => {
    await useCase.execute({ path: '/repos/test', name: 'Custom Name' });

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Custom Name' }));
  });

  it('should derive name from last path segment', async () => {
    await useCase.execute({ path: '/Users/dev/workspace/api-server' });

    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'api-server' }));
  });
});
