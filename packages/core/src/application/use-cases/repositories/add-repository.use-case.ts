/**
 * Add Repository Use Case
 *
 * Creates a new Repository entity from a filesystem path.
 * Normalizes the path and returns existing repository if path already tracked.
 */

import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import type { Repository } from '../../../domain/generated/output.js';
import type { IRepositoryRepository } from '../../ports/output/repositories/repository-repository.interface.js';

export interface AddRepositoryInput {
  path: string;
  name?: string;
}

/**
 * Normalizes a path by removing trailing slashes.
 */
function normalizePath(p: string): string {
  // Remove trailing slashes but keep root "/"
  return p.length > 1 ? p.replace(/\/+$/, '') : p;
}

@injectable()
export class AddRepositoryUseCase {
  constructor(
    @inject('IRepositoryRepository')
    private readonly repositoryRepo: IRepositoryRepository
  ) {}

  async execute(input: AddRepositoryInput): Promise<Repository> {
    const normalizedPath = normalizePath(input.path);

    // Check for existing active repository with same path
    const existing = await this.repositoryRepo.findByPath(normalizedPath);
    if (existing) {
      return existing;
    }

    // Check for soft-deleted repository — restore it instead of creating a duplicate
    const deleted = await this.repositoryRepo.findByPathIncludingDeleted(normalizedPath);
    if (deleted) {
      await this.repositoryRepo.restore(deleted.id);
      return { ...deleted, deletedAt: undefined, updatedAt: new Date() };
    }

    const now = new Date();
    const name = input.name ?? normalizedPath.split('/').pop() ?? normalizedPath;

    const repository: Repository = {
      id: randomUUID(),
      name,
      path: normalizedPath,
      createdAt: now,
      updatedAt: now,
    };

    await this.repositoryRepo.create(repository);
    return repository;
  }
}
