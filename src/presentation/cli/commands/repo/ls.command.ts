/**
 * Repo List Command
 *
 * List all tracked repositories in a formatted table.
 *
 * Usage:
 *   shep repo ls
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ListRepositoriesUseCase } from '@/application/use-cases/repositories/list-repositories.use-case.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import { colors, messages, renderListView } from '../../ui/index.js';

/** Format a duration in ms to a compact human-readable string. */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function createLsCommand(): Command {
  return new Command('ls').description('List tracked repositories').action(async () => {
    try {
      const useCase = container.resolve(ListRepositoriesUseCase);
      const featureRepo = container.resolve<IFeatureRepository>('IFeatureRepository');
      const repositories = await useCase.execute();

      const now = Date.now();
      const rows = await Promise.all(
        repositories.map(async (repo) => {
          const features = await featureRepo.list({ repositoryPath: repo.path });
          return [
            repo.id.substring(0, 8),
            repo.name,
            String(features.length),
            repo.path,
            colors.muted(`${formatDuration(now - new Date(repo.createdAt).getTime())} ago`),
          ];
        })
      );

      renderListView({
        title: 'Repositories',
        columns: [
          { label: 'ID', width: 10 },
          { label: 'Name', width: 28 },
          { label: 'Features', width: 10 },
          { label: 'Path', width: 36 },
          { label: 'Created', width: 12 },
        ],
        rows,
        emptyMessage: 'No repositories found',
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      messages.error('Failed to list repositories', err);
      process.exitCode = 1;
    }
  });
}
