import type { IdeLauncher } from './ide-launcher.interface';
import { AntigravityLauncher } from './antigravity.launcher';
import { CursorLauncher } from './cursor.launcher';
import { VsCodeLauncher } from './vscode.launcher';
import { WindsurfLauncher } from './windsurf.launcher';
import { ZedLauncher } from './zed.launcher';

/**
 * Create a registry of all supported IDE launchers, keyed by editor ID.
 *
 * @returns A Map from editor ID (e.g., "vscode") to its IdeLauncher instance.
 */
export function createLauncherRegistry(): Map<string, IdeLauncher> {
  const launchers: IdeLauncher[] = [
    new VsCodeLauncher(),
    new CursorLauncher(),
    new WindsurfLauncher(),
    new ZedLauncher(),
    new AntigravityLauncher(),
  ];

  const registry = new Map<string, IdeLauncher>();
  for (const launcher of launchers) {
    registry.set(launcher.editorId, launcher);
  }
  return registry;
}
