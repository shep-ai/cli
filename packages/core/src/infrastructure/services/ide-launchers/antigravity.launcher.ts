import { spawn, execFile } from 'node:child_process';

import { EditorType } from '../../../domain/generated/output.js';
import type { IdeLauncher } from './ide-launcher.interface';

export class AntigravityLauncher implements IdeLauncher {
  readonly name = 'Antigravity';
  readonly editorId = EditorType.Antigravity;
  readonly binary = 'antigravity';

  async launch(path: string): Promise<void> {
    const child = spawn(this.binary, [path], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  }

  checkAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile('which', [this.binary], (err) => {
        resolve(!err);
      });
    });
  }
}
