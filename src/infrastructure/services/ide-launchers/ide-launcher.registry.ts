import type { EditorType } from '../../../domain/generated/output.js';
import type { IdeLauncher } from './ide-launcher.interface';
import { AntigravityLauncher } from './antigravity.launcher';
import { CursorLauncher } from './cursor.launcher';
import { VsCodeLauncher } from './vscode.launcher';
import { WindsurfLauncher } from './windsurf.launcher';
import { ZedLauncher } from './zed.launcher';

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
