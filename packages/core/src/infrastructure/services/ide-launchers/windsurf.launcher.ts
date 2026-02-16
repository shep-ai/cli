import { spawn, execFile } from 'node:child_process';

import { EditorType } from '../../../domain/generated/output.js';
import type { IdeLauncher } from './ide-launcher.interface';

export class WindsurfLauncher implements IdeLauncher {
  readonly name = 'Windsurf';
  readonly editorId = EditorType.Windsurf;
  readonly binary = 'windsurf';

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
