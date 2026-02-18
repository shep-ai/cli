/**
 * Feature New Command Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockCreateExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockCreateExecute: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('@/application/use-cases/features/create-feature.use-case.js', () => ({
  CreateFeatureUseCase: class {
    execute = mockCreateExecute;
  },
}));

vi.mock('@/infrastructure/services/filesystem/shep-directory.service.js', () => ({
  getShepHomeDir: () => '/home/test/.shep',
}));

vi.mock('../../../../../../src/presentation/cli/ui/index.js', () => ({
  colors: {
    muted: (s: string) => s,
    accent: (s: string) => s,
    success: (s: string) => s,
    brand: (s: string) => s,
  },
  messages: {
    newline: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  spinner: vi.fn((_label: string, fn: () => Promise<unknown>) => fn()),
}));

import { createNewCommand } from '../../../../../../src/presentation/cli/commands/feat/new.command.js';

describe('createNewCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;
    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'CreateFeatureUseCase') return { execute: mockCreateExecute };
      return {};
    });
    mockCreateExecute.mockResolvedValue({
      feature: {
        id: 'feat-001',
        name: 'Test Feature',
        slug: 'test-feature',
        branch: 'feat/test-feature',
        lifecycle: 'Requirements',
        agentRunId: 'run-001',
        specPath: '/specs/001-test-feature',
      },
    });
  });

  it('should create a command named "new"', () => {
    const cmd = createNewCommand();
    expect(cmd.name()).toBe('new');
  });

  it('should not have --interactive option', () => {
    const cmd = createNewCommand();
    const interactive = cmd.options.find((o) => o.long === '--interactive');
    expect(interactive).toBeUndefined();
  });

  describe('approval gates from flags', () => {
    it('should default to { allowPrd: false, allowPlan: false, allowMerge: false } when no flags', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
        })
      );
    });

    it('should set allowPrd=true with --allow-prd', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--allow-prd'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
        })
      );
    });

    it('should set allowPlan=true with --allow-plan', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--allow-plan'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: false, allowPlan: true, allowMerge: false },
        })
      );
    });

    it('should compose --allow-prd and --allow-plan flags', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--allow-prd', '--allow-plan'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: false },
        })
      );
    });

    it('should set both true with --allow-all (fully autonomous)', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--allow-all'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: undefined,
        })
      );
    });
  });

  it('should show worktree path in output', async () => {
    const cmd = createNewCommand();
    await cmd.parseAsync(['Add feature'], { from: 'user' });

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .map((args) => args.join(' '))
      .join('\n');
    expect(logCalls).toMatch(/worktree/i);
    expect(logCalls).toMatch(/\.shep/);
  });

  it('should show spec path in output', async () => {
    const cmd = createNewCommand();
    await cmd.parseAsync(['Add feature'], { from: 'user' });

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .map((args) => args.join(' '))
      .join('\n');
    expect(logCalls).toMatch(/spec/i);
    expect(logCalls).toMatch(/001-test-feature/);
  });

  it('should show approval behavior hint in output', async () => {
    const cmd = createNewCommand();
    await cmd.parseAsync(['Add feature'], { from: 'user' });

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .map((args) => args.join(' '))
      .join('\n');
    expect(logCalls).toMatch(/pause after every phase/);
  });

  it('should show specific hint for --allow-prd', async () => {
    const cmd = createNewCommand();
    await cmd.parseAsync(['Add feature', '--allow-prd'], { from: 'user' });

    const logCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls
      .map((args) => args.join(' '))
      .join('\n');
    expect(logCalls).toMatch(/auto-approve through requirements/);
  });

  it('should set exitCode 1 on error', async () => {
    mockCreateExecute.mockRejectedValue(new Error('Something failed'));

    const cmd = createNewCommand();
    await cmd.parseAsync(['Add feature'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });
});
