import { spawn, execFile } from 'node:child_process';

import { EditorType } from '../../../domain/generated/output.js';
import type { IdeLauncher } from './ide-launcher.interface';

export class VsCodeLauncher implements IdeLauncher {
  readonly name = 'VS Code';
  readonly editorId = EditorType.VsCode;
  readonly binary = 'code';

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
