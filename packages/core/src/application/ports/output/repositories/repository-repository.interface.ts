/**
 * Repository Repository Interface (Output Port)
 *
 * Defines the contract for Repository entity persistence operations.
 */

import type { Repository } from '../../../../domain/generated/output.js';

export interface IRepositoryRepository {
  create(repository: Repository): Promise<void>;
  findById(id: string): Promise<Repository | null>;
  findByPath(path: string): Promise<Repository | null>;
  list(): Promise<Repository[]>;
  remove(id: string): Promise<void>;
}
