import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteRepositoryUseCase } from '@/application/use-cases/repositories/delete-repository.use-case.js';
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

const sampleRepo: Repository = {
  id: 'repo-abc-123',
  name: 'my-project',
  path: '/home/user/my-project',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('DeleteRepositoryUseCase', () => {
  let useCase: DeleteRepositoryUseCase;
  let mockRepo: IRepositoryRepository;

  beforeEach(() => {
    mockRepo = createMockRepo();
    useCase = new DeleteRepositoryUseCase(mockRepo);
  });

  it('should soft-delete an existing repository', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(sampleRepo);

    await useCase.execute('repo-abc-123');

    expect(mockRepo.findById).toHaveBeenCalledWith('repo-abc-123');
    expect(mockRepo.softDelete).toHaveBeenCalledWith('repo-abc-123');
  });

  it('should throw when repository is not found', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('non-existent')).rejects.toThrow(
      'Repository not found: "non-existent"'
    );
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });

  it('should not call remove (hard delete)', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(sampleRepo);

    await useCase.execute('repo-abc-123');

    expect(mockRepo.remove).not.toHaveBeenCalled();
  });
});
