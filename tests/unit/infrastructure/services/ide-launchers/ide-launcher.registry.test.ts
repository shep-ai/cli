// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { EditorType } from '@/domain/generated/output';

const mockSpawn = vi.hoisted(() => vi.fn());
const mockExecFile = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: mockSpawn, execFile: mockExecFile };
});

import { createLauncherRegistry } from '@/infrastructure/services/ide-launchers/ide-launcher.registry';

describe('createLauncherRegistry', () => {
  it('should return a Map with 5 entries', () => {
    const registry = createLauncherRegistry();
    expect(registry.size).toBe(5);
  });

  it.each([
    [EditorType.VsCode, 'code'],
    [EditorType.Cursor, 'cursor'],
    [EditorType.Windsurf, 'windsurf'],
    [EditorType.Zed, 'zed'],
    [EditorType.Antigravity, 'agy'],
  ])('should map editorId "%s" to binary "%s"', (editorId, expectedBinary) => {
    const registry = createLauncherRegistry();
    const launcher = registry.get(editorId);
    expect(launcher).toBeDefined();
    expect(launcher!.editorId).toBe(editorId);
    expect(launcher!.binary).toBe(expectedBinary);
  });

  it('should return IdeLauncher instances with launch and checkAvailable methods', () => {
    const registry = createLauncherRegistry();
    for (const [, launcher] of registry) {
      expect(typeof launcher.launch).toBe('function');
      expect(typeof launcher.checkAvailable).toBe('function');
      expect(typeof launcher.name).toBe('string');
      expect(launcher.name.length).toBeGreaterThan(0);
    }
  });
});
