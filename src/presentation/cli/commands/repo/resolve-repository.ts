/**
 * Shared helper: resolve a repository by exact or prefix ID.
 */

import { container } from '@/infrastructure/di/container.js';
import type { IRepositoryRepository } from '@/application/ports/output/repositories/repository-repository.interface.js';
import type { Repository } from '@/domain/generated/output.js';
import { getCliI18n } from '../../i18n.js';

export async function resolveRepository(
  id: string
): Promise<{ repository: Repository } | { error: string }> {
  const t = getCliI18n().t;
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
        error: t('cli:commands.repo.resolve.multipleMatch', {
          id,
          matches: matches.map((m) => m.id.substring(0, 8)).join(', '),
        }),
      };
    }
  }

  return { error: t('cli:commands.repo.resolve.notFound', { id }) };
}
