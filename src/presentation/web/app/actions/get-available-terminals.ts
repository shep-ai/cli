'use server';

import { resolve } from '@/lib/server-container';
import type { IToolInstallerService } from '@shepai/core/application/ports/output/services/tool-installer.service';

export interface AvailableTerminal {
  id: string;
  name: string;
  available: boolean;
}

/**
 * Returns the list of terminal entries from the DI container's IToolInstallerService,
 * filtered to the current platform with availability checks.
 *
 * Using the DI container (not a direct import from tool-metadata) ensures that
 * TOOL_METADATA is read from the correct tools/ directory path — it is loaded once
 * in the Node.js CLI bootstrap context where import.meta.url resolves correctly.
 * Direct imports of tool-metadata from Next.js server action bundles break in
 * standalone production mode because import.meta.url points to the chunk file.
 */
export async function getAvailableTerminals(): Promise<AvailableTerminal[]> {
  try {
    const service = resolve<IToolInstallerService>('IToolInstallerService');
    return await service.listAvailableTerminals();
  } catch {
    return [{ id: 'system', name: 'System Terminal', available: true }];
  }
}
