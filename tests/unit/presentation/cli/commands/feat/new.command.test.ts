/**
 * Feature New Command Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockCreateExecute, mockFindByIdPrefix } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockCreateExecute: vi.fn(),
  mockFindByIdPrefix: vi.fn(),
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

const { mockGetSettings, mockHasSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
  mockHasSettings: vi.fn(),
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: (...args: unknown[]) => mockGetSettings(...args),
  hasSettings: (...args: unknown[]) => mockHasSettings(...args),
}));

import { createNewCommand } from '../../../../../../src/presentation/cli/commands/feat/new.command.js';

function makeSettings(overrides: { openPr?: boolean } = {}) {
  return {
    workflow: {
      openPrOnImplementationComplete: overrides.openPr ?? false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
    },
  };
}

describe('createNewCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;
    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'CreateFeatureUseCase') return { execute: mockCreateExecute };
      if (key === 'IFeatureRepository') return { findByIdPrefix: mockFindByIdPrefix };
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
    mockHasSettings.mockReturnValue(true);
    mockGetSettings.mockReturnValue(makeSettings());
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

    it('should set allowMerge=true with --allow-merge', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--allow-merge'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: expect.objectContaining({ allowMerge: true }),
        })
      );
    });

    it('should set all gates true with --allow-all (fully autonomous)', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--allow-all'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: true },
        })
      );
    });
  });

  describe('--pr flag', () => {
    it('should default openPr from settings (false)', async () => {
      mockGetSettings.mockReturnValue(makeSettings({ openPr: false }));

      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(expect.objectContaining({ openPr: false }));
    });

    it('should default openPr from settings (true)', async () => {
      mockGetSettings.mockReturnValue(makeSettings({ openPr: true }));

      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(expect.objectContaining({ openPr: true }));
    });

    it('should set openPr=true with --pr', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--pr'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(expect.objectContaining({ openPr: true }));
    });

    it('should set openPr=false with --no-pr', async () => {
      mockGetSettings.mockReturnValue(makeSettings({ openPr: true }));

      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--no-pr'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(expect.objectContaining({ openPr: false }));
    });
  });

  describe('settings fallback when settings unavailable', () => {
    it('should default openPr=false when settings not available', async () => {
      mockHasSettings.mockReturnValue(false);

      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(expect.objectContaining({ openPr: false }));
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
    expect(logCalls).toMatch(/auto-approve: PRD/);
  });

  it('should set exitCode 1 on error', async () => {
    mockCreateExecute.mockRejectedValue(new Error('Something failed'));

    const cmd = createNewCommand();
    await cmd.parseAsync(['Add feature'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  describe('--parent flag', () => {
    const parentFeature = {
      id: 'parent-feature-uuid-001',
      name: 'Parent Feature',
      lifecycle: 'Implementation',
    };

    it('should not pass parentId when --parent is not provided', async () => {
      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature'], { from: 'user' });

      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.not.objectContaining({ parentId: expect.anything() })
      );
    });

    it('should resolve parent ID prefix and pass parentId to use case', async () => {
      mockFindByIdPrefix.mockResolvedValue(parentFeature);

      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--parent', 'parent-fe'], { from: 'user' });

      expect(mockFindByIdPrefix).toHaveBeenCalledWith('parent-fe');
      expect(mockCreateExecute).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'parent-feature-uuid-001' })
      );
    });

    it('should display error and set exit code 1 when parent prefix is not found', async () => {
      mockFindByIdPrefix.mockResolvedValue(null);
      const { messages: mockMessages } = await import(
        '../../../../../../src/presentation/cli/ui/index.js'
      );

      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--parent', 'nonexistent'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(mockMessages.error).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
      expect(mockCreateExecute).not.toHaveBeenCalled();
    });

    it('should show blocked-state message when created feature has Blocked lifecycle', async () => {
      mockFindByIdPrefix.mockResolvedValue(parentFeature);
      mockCreateExecute.mockResolvedValue({
        feature: {
          id: 'child-feat-001',
          name: 'Child Feature',
          slug: 'child-feature',
          branch: 'feat/child-feature',
          lifecycle: 'Blocked',
          agentRunId: null,
          specPath: null,
        },
      });
      const { messages: mockMessages } = await import(
        '../../../../../../src/presentation/cli/ui/index.js'
      );

      const cmd = createNewCommand();
      await cmd.parseAsync(['Child feature', '--parent', 'parent-fe'], { from: 'user' });

      expect(mockMessages.info).toHaveBeenCalledWith(expect.stringContaining('Blocked'));
    });

    it('should not show blocked-state message when created feature has non-Blocked lifecycle', async () => {
      mockFindByIdPrefix.mockResolvedValue(parentFeature);
      const { messages: mockMessages } = await import(
        '../../../../../../src/presentation/cli/ui/index.js'
      );

      const cmd = createNewCommand();
      await cmd.parseAsync(['Add feature', '--parent', 'parent-fe'], { from: 'user' });

      expect(mockMessages.info).not.toHaveBeenCalled();
    });

    it('should expose --parent option in command help', () => {
      const cmd = createNewCommand();
      const parentOption = cmd.options.find((o) => o.long === '--parent');
      expect(parentOption).toBeDefined();
      expect(parentOption?.description).toBeTruthy();
    });
  });
});
