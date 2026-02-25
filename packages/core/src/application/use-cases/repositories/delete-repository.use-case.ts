/**
 * Delete Repository Use Case
 *
 * Soft-deletes a Repository by setting its deletedAt timestamp.
 * The repository data remains in the database for potential recovery.
 */

import { injectable, inject } from 'tsyringe';
import type { IRepositoryRepository } from '../../ports/output/repositories/repository-repository.interface.js';

@injectable()
export class DeleteRepositoryUseCase {
  constructor(
    @inject('IRepositoryRepository')
    private readonly repositoryRepo: IRepositoryRepository
  ) {}

  async execute(id: string): Promise<void> {
    const repository = await this.repositoryRepo.findById(id);
    if (!repository) {
      throw new Error(`Repository not found: "${id}"`);
    }

    await this.repositoryRepo.softDelete(id);
  }
}
