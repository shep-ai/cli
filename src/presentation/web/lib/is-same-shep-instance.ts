import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Check if a target path is the same directory (or a worktree of) the
 * currently running shep instance. Starting a dev server there would spawn
 * another shep instance that conflicts with the shared ~/.shep/data DB.
 */
export function isSameShepInstance(targetPath: string): boolean {
  const instancePath = process.env.NEXT_PUBLIC_SHEP_INSTANCE_PATH ?? process.cwd();

  try {
    const normalizedTarget = realpathSync(resolve(targetPath)).replace(/\\/g, '/');
    const normalizedInstance = realpathSync(resolve(instancePath)).replace(/\\/g, '/');
    return normalizedTarget === normalizedInstance;
  } catch {
    return false;
  }
}
