/**
 * Shared helper: resolve a repository by exact or prefix ID.
 */

import { container } from '@/infrastructure/di/container.js';
import type { IRepositoryRepository } from '@/application/ports/output/repositories/repository-repository.interface.js';
import type { Repository } from '@/domain/generated/output.js';

export async function resolveRepository(
  id: string
): Promise<{ repository: Repository } | { error: string }> {
  const repo = container.resolve<IRepositoryRepository>('IRepositoryRepository');

  // Try exact match first
  const exact = await repo.findById(id);
  if (exact) return { repository: exact };

  // Try prefix match
  if (id.length < 36) {
    const all = await repo.list();
    const matches = all.filter((r) => r.id.startsWith(id));

    if (matches.length === 1) return { repository: matches[0] };
    if (matches.length > 1) {
      return {
        error: `Multiple repositories match prefix "${id}": ${matches.map((m) => m.id.substring(0, 8)).join(', ')}`,
      };
    }
  }

  return { error: `Repository not found: ${id}` };
}
