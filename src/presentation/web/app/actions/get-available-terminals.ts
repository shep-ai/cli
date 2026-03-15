'use server';

import { platform } from 'node:os';
import { getTerminalEntries } from '@shepai/core/infrastructure/services/tool-installer/tool-metadata';
import { checkBinaryExists } from '@shepai/core/infrastructure/services/tool-installer/binary-exists';

export interface AvailableTerminal {
  id: string;
  name: string;
  available: boolean;
}

/**
 * Returns the list of terminal entries from tool metadata, filtered to the
 * current platform, with availability checks. The "system-terminal" entry
 * is always marked available and listed first.
 */
export async function getAvailableTerminals(): Promise<AvailableTerminal[]> {
  const currentPlatform = platform();
  const entries = getTerminalEntries();

  const results: AvailableTerminal[] = [];

  for (const [id, meta] of entries) {
    // Skip terminals not supported on this platform
    if (
      meta.platforms &&
      !meta.platforms.includes(currentPlatform as 'linux' | 'darwin' | 'win32')
    ) {
      continue;
    }

    // System terminal is always available
    if (id === 'system-terminal') {
      results.unshift({ id: 'system', name: meta.name, available: true });
      continue;
    }

    // Check binary availability
    const binary = typeof meta.binary === 'string' ? meta.binary : meta.binary[currentPlatform];
    if (!binary) continue;

    // For app-bundle terminals (Warp, iTerm2) that use verifyCommand instead of binary check
    let available = false;
    if (meta.verifyCommand.startsWith('test ')) {
      // Use verifyCommand for app-bundle checks (e.g., "test -d /Applications/Warp.app")
      try {
        const { execSync } = await import('node:child_process');
        execSync(meta.verifyCommand, { stdio: 'ignore' });
        available = true;
      } catch {
        available = false;
      }
    } else {
      const result = await checkBinaryExists(binary);
      available = result.found;
    }

    results.push({ id, name: meta.name, available });
  }

  // Ensure system terminal is always present even if not in tool metadata
  if (!results.some((r) => r.id === 'system')) {
    results.unshift({ id: 'system', name: 'System Terminal', available: true });
  }

  return results;
}
