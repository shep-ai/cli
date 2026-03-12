// @vitest-environment node

/**
 * API Route Tests: GET /api/version
 *
 * Tests that the version API route returns runtime environment variables
 * rather than build-time inlined values.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET, dynamic } from '@/app/api/version/route';

describe('GET /api/version', () => {
  it('exports dynamic = force-dynamic to prevent static prerendering', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SHEP_VERSION = '1.101.0';
    process.env.NEXT_PUBLIC_SHEP_PACKAGE_NAME = '@shepai/cli';
    process.env.NEXT_PUBLIC_SHEP_DESCRIPTION = 'Test description';
    process.env.NEXT_PUBLIC_SHEP_BRANCH = 'main';
    process.env.NEXT_PUBLIC_SHEP_COMMIT = 'abc1234';
    process.env.NEXT_PUBLIC_SHEP_INSTANCE_PATH = '/test/path';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns version from runtime environment', async () => {
    const response = GET();
    const data = await response.json();

    expect(data.version).toBe('1.101.0');
  });

  it('returns all version fields', async () => {
    const response = GET();
    const data = await response.json();

    expect(data).toEqual({
      version: '1.101.0',
      packageName: '@shepai/cli',
      description: 'Test description',
      branch: 'main',
      commitHash: 'abc1234',
      instancePath: '/test/path',
      isDev: false, // NODE_ENV is 'test' in vitest, not 'development'
    });
  });

  it('returns defaults when env vars are not set', async () => {
    delete process.env.NEXT_PUBLIC_SHEP_VERSION;
    delete process.env.NEXT_PUBLIC_SHEP_PACKAGE_NAME;
    delete process.env.NEXT_PUBLIC_SHEP_DESCRIPTION;
    delete process.env.NEXT_PUBLIC_SHEP_BRANCH;
    delete process.env.NEXT_PUBLIC_SHEP_COMMIT;
    delete process.env.NEXT_PUBLIC_SHEP_INSTANCE_PATH;

    const response = GET();
    const data = await response.json();

    expect(data.version).toBe('unknown');
    expect(data.packageName).toBe('@shepai/cli');
    expect(data.description).toBe('Autonomous AI Native SDLC Platform');
    expect(data.branch).toBe('');
    expect(data.commitHash).toBe('');
    expect(data.instancePath).toBe('');
  });
});
