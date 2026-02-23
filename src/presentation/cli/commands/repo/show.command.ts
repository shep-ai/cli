/**
 * Repo Show Command
 *
 * Display details of a specific tracked repository.
 *
 * Usage:
 *   shep repo show <id>
 */

import { Command } from 'commander';
import { messages, renderDetailView } from '../../ui/index.js';
import { resolveRepository } from './resolve-repository.js';

function formatDate(date?: Date | string | null): string | null {
  if (!date) return null;
  try {
    return new Date(date).toLocaleString();
  } catch {
    return String(date);
  }
}

export function createShowCommand(): Command {
  return new Command('show')
    .description('Display details of a tracked repository')
    .argument('<id>', 'Repository ID (or prefix)')
    .action(async (id: string) => {
      try {
        const resolved = await resolveRepository(id);
        if ('error' in resolved) {
          messages.error(resolved.error);
          process.exitCode = 1;
          return;
        }
        const repository = resolved.repository;

        renderDetailView({
          title: 'Repository',
          sections: [
            {
              fields: [
                { label: 'ID', value: repository.id },
                { label: 'Name', value: repository.name },
                { label: 'Path', value: repository.path },
              ],
            },
            {
              title: 'Timestamps',
              fields: [
                { label: 'Created', value: formatDate(repository.createdAt) },
                { label: 'Updated', value: formatDate(repository.updatedAt) },
                { label: 'Deleted', value: formatDate(repository.deletedAt) },
              ],
            },
          ],
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to show repository', err);
        process.exitCode = 1;
      }
    });
}
