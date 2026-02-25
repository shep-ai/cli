import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { getDaemonStatePath } from '@/infrastructure/services/filesystem/shep-directory.service.js';

describe('getDaemonStatePath', () => {
  let originalShepHome: string | undefined;

  beforeEach(() => {
    originalShepHome = process.env.SHEP_HOME;
  });

  afterEach(() => {
    if (originalShepHome === undefined) {
      delete process.env.SHEP_HOME;
    } else {
      process.env.SHEP_HOME = originalShepHome;
    }
  });

  it('returns ~/.shep/daemon.json when SHEP_HOME is not set', () => {
    delete process.env.SHEP_HOME;
    const expected = join(homedir(), '.shep', 'daemon.json');
    expect(getDaemonStatePath()).toBe(expected);
  });

  it('returns SHEP_HOME/daemon.json when SHEP_HOME is set', () => {
    process.env.SHEP_HOME = '/tmp/test-shep-home';
    expect(getDaemonStatePath()).toBe('/tmp/test-shep-home/daemon.json');
  });
});
