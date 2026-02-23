/**
 * List Repositories Use Case
 *
 * Returns all tracked repositories.
 */

import { injectable, inject } from 'tsyringe';
import type { Repository } from '../../../domain/generated/output.js';
import type { IRepositoryRepository } from '../../ports/output/repositories/repository-repository.interface.js';

@injectable()
export class ListRepositoriesUseCase {
  constructor(
    @inject('IRepositoryRepository')
    private readonly repositoryRepo: IRepositoryRepository
  ) {}

  async execute(): Promise<Repository[]> {
    return this.repositoryRepo.list();
  }
}
