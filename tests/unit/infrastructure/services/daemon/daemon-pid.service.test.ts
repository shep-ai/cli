import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, rm, readFile } from 'node:fs/promises';

import type { DaemonState } from '@/application/ports/output/services/daemon-service.interface.js';
import { DaemonPidService } from '@/infrastructure/services/daemon/daemon-pid.service.js';

const sampleState: DaemonState = {
  pid: 12345,
  port: 4050,
  startedAt: '2026-02-25T01:00:00.000Z',
};

describe('DaemonPidService', () => {
  let tmpDir: string;
  let originalShepHome: string | undefined;
  let service: DaemonPidService;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shep-daemon-test-'));
    originalShepHome = process.env.SHEP_HOME;
    process.env.SHEP_HOME = tmpDir;
    service = new DaemonPidService();
  });

  afterEach(async () => {
    if (originalShepHome === undefined) {
      delete process.env.SHEP_HOME;
    } else {
      process.env.SHEP_HOME = originalShepHome;
    }
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('read()', () => {
    it('returns null when daemon.json does not exist', async () => {
      const result = await service.read();
      expect(result).toBeNull();
    });

    it('returns the DaemonState after write + read roundtrip', async () => {
      await service.write(sampleState);
      const result = await service.read();
      expect(result).toEqual(sampleState);
    });
  });

  describe('write()', () => {
    it('writes daemon.json with the correct JSON content', async () => {
      await service.write(sampleState);
      const raw = await readFile(join(tmpDir, 'daemon.json'), 'utf-8');
      expect(JSON.parse(raw)).toEqual(sampleState);
    });

    it('leaves no .tmp file after write (atomic rename cleans up)', async () => {
      const { existsSync } = await import('node:fs');
      await service.write(sampleState);
      // The temp file should be gone after the atomic rename completes
      expect(existsSync(join(tmpDir, 'daemon.json.tmp'))).toBe(false);
      // But the final file should exist
      expect(existsSync(join(tmpDir, 'daemon.json'))).toBe(true);
    });
  });

  describe('delete()', () => {
    it('removes daemon.json after it was written', async () => {
      await service.write(sampleState);
      await service.delete();
      const result = await service.read();
      expect(result).toBeNull();
    });

    it('does not throw when daemon.json does not exist', async () => {
      await expect(service.delete()).resolves.not.toThrow();
    });
  });

  describe('isAlive()', () => {
    it('returns true for the current process PID', () => {
      expect(service.isAlive(process.pid)).toBe(true);
    });

    it('returns false for a non-existent PID', () => {
      // PID 999999999 is virtually guaranteed not to exist
      expect(service.isAlive(999999999)).toBe(false);
    });

    it('returns false for a non-integer PID (NaN)', () => {
      expect(service.isAlive(NaN)).toBe(false);
    });

    it('returns false for a negative PID', () => {
      expect(service.isAlive(-1)).toBe(false);
    });

    it('returns false for zero', () => {
      expect(service.isAlive(0)).toBe(false);
    });
  });
});
