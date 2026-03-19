import type { ToolStatusResult } from '../../../../src/presentation/web/app/actions/check-tool-status';

const defaultResult: ToolStatusResult = {
  git: {
    installed: true,
    version: '2.43.0',
    installCommand: 'sudo apt-get install -y git',
    installUrl: 'https://git-scm.com',
  },
  gh: {
    installed: true,
    version: '2.40.1',
    installCommand: 'sudo apt install gh -y',
    installUrl: 'https://cli.github.com',
  },
};

/** Override in stories via `window.__mockToolStatus` */
export async function checkToolStatus(): Promise<ToolStatusResult> {
  const win = globalThis as Record<string, unknown>;
  if (win.__mockToolStatus) return win.__mockToolStatus as ToolStatusResult;
  return defaultResult;
}
