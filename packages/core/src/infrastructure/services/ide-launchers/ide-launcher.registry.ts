import type { EditorType } from '../../../domain/generated/output.js';
import type { IdeLauncher } from './ide-launcher.interface.js';
import { AntigravityLauncher } from './antigravity.launcher.js';
import { CursorLauncher } from './cursor.launcher.js';
import { VsCodeLauncher } from './vscode.launcher.js';
import { WindsurfLauncher } from './windsurf.launcher.js';
import { ZedLauncher } from './zed.launcher.js';

/**
 * Create a registry of all supported IDE launchers, keyed by EditorType.
 *
 * @returns A Map from EditorType to its IdeLauncher instance.
 */
export function createLauncherRegistry(): Map<EditorType, IdeLauncher> {
  const launchers: IdeLauncher[] = [
    new VsCodeLauncher(),
    new CursorLauncher(),
    new WindsurfLauncher(),
    new ZedLauncher(),
    new AntigravityLauncher(),
  ];

  const registry = new Map<EditorType, IdeLauncher>();
  for (const launcher of launchers) {
    registry.set(launcher.editorId, launcher);
  }
  return registry;
}
