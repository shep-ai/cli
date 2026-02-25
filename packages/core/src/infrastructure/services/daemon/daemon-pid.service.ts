/**
 * DaemonPidService
 *
 * Infrastructure service for managing the daemon state file (~/.shep/daemon.json).
 * Implements IDaemonService output port.
 *
 * Uses atomic write (write-to-temp + rename) to prevent partial-write corruption.
 */

import { readFile, writeFile, unlink, rename } from 'node:fs/promises';
import { injectable } from 'tsyringe';

import type {
  IDaemonService,
  DaemonState,
} from '../../../application/ports/output/services/daemon-service.interface.js';
import { getDaemonStatePath } from '../filesystem/shep-directory.service.js';

@injectable()
export class DaemonPidService implements IDaemonService {
  async read(): Promise<DaemonState | null> {
    const filePath = getDaemonStatePath();
    try {
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw) as DaemonState;
    } catch (err) {
      if (isEnoent(err)) return null;
      throw err;
    }
  }

  async write(data: DaemonState): Promise<void> {
    const finalPath = getDaemonStatePath();
    const tmpPath = `${finalPath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(data), 'utf-8');
    await rename(tmpPath, finalPath);
  }

  async delete(): Promise<void> {
    const filePath = getDaemonStatePath();
    try {
      await unlink(filePath);
    } catch (err) {
      if (isEnoent(err)) return;
      throw err;
    }
  }

  isAlive(pid: number): boolean {
    if (!isValidPid(pid)) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}

function isEnoent(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

function isValidPid(pid: number): boolean {
  return Number.isFinite(pid) && Number.isInteger(pid) && pid > 0;
}
