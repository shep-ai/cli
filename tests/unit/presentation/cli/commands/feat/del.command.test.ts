/**
 * Feature Delete Command Unit Tests
 *
 * Tests for the cleanup option flag and prompt behavior.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockShowExecute, mockDeleteExecute, mockConfirm } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockShowExecute: vi.fn(),
  mockDeleteExecute: vi.fn(),
  mockConfirm: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: (...args: unknown[]) => mockConfirm(...args),
}));

vi.mock('@/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class {
    execute = mockShowExecute;
  },
}));

vi.mock('@/application/use-cases/features/delete-feature.use-case.js', () => ({
  DeleteFeatureUseCase: class {
    execute = mockDeleteExecute;
  },
}));

import { createDelCommand } from '../../../../../../src/presentation/cli/commands/feat/del.command.js';

const mockFeature = {
  id: 'feat-001',
  name: 'Test Feature',
  branch: 'feat/test-feature',
};

const mockFeatureWithOpenPr = {
  id: 'feat-001',
  name: 'Test Feature',
  branch: 'feat/test-feature',
  pr: { number: 42, status: 'Open' },
};

const mockFeatureWithClosedPr = {
  id: 'feat-001',
  name: 'Test Feature',
  branch: 'feat/test-feature',
  pr: { number: 42, status: 'Closed' },
};

const mockFeatureWithMergedPr = {
  id: 'feat-001',
  name: 'Test Feature',
  branch: 'feat/test-feature',
  pr: { number: 42, status: 'Merged' },
};

describe('createDelCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined as any;

    mockShowExecute.mockResolvedValue(mockFeature);
    mockDeleteExecute.mockResolvedValue(mockFeature);

    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'ShowFeatureUseCase') return { execute: mockShowExecute };
      if (key === 'DeleteFeatureUseCase') return { execute: mockDeleteExecute };
      return {};
    });
  });

  it('should create a command named "del"', () => {
    const cmd = createDelCommand();
    expect(cmd.name()).toBe('del');
  });

  it('should pass cleanup=true when user confirms cleanup (default)', async () => {
    // First confirm = delete, second confirm = cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  it('should pass cleanup=false when user declines cleanup prompt', async () => {
    // First confirm = delete, second confirm = decline cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: false });
  });

  it('should pass cleanup=true with --force (skips all prompts)', async () => {
    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force'], { from: 'user' });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  it('should pass cleanup=false with --force --no-cleanup', async () => {
    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force', '--no-cleanup'], { from: 'user' });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: false });
  });

  it('should pass cleanup=false with --no-cleanup (skips cleanup prompt)', async () => {
    // Only one confirm prompt (delete) since cleanup prompt is skipped
    mockConfirm.mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--no-cleanup'], { from: 'user' });

    // Only one confirm call (delete), no cleanup prompt
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: false });
  });

  // --- close-PR flag tests (task-8) ---

  it('should pass closePr=false with --force --no-close-pr', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force', '--no-close-pr'], { from: 'user' });

    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true, closePr: false });
  });

  it('should pass closePr=false with --no-close-pr (interactive)', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);
    // First confirm = delete, second confirm = cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--no-close-pr'], { from: 'user' });

    // Two confirm calls: delete + cleanup (no close-PR prompt since flag overrides)
    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true, closePr: false });
  });

  // --- close-PR prompt tests (task-9) ---

  it('should prompt to close PR when feature has open PR and cleanup is enabled', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);
    // First confirm = delete, second confirm = cleanup, third confirm = close PR
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockConfirm).toHaveBeenCalledTimes(3);
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('close the pull request'),
      })
    );
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true, closePr: true });
  });

  it('should pass closePr=false when user declines close-PR prompt', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);
    // First confirm = delete, second confirm = cleanup, third confirm = decline close PR
    mockConfirm
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true, closePr: false });
  });

  it('should not prompt to close PR when feature has no PR', async () => {
    // mockFeature has no PR — default fixture
    // First confirm = delete, second confirm = cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    // Only two confirm calls: delete + cleanup (no close-PR prompt)
    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  it('should not prompt to close PR when PR is already closed', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithClosedPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithClosedPr);
    // First confirm = delete, second confirm = cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  it('should not prompt to close PR when PR is merged', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithMergedPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithMergedPr);
    // First confirm = delete, second confirm = cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  it('should not prompt to close PR when cleanup is disabled', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);
    // First confirm = delete, second confirm = decline cleanup
    mockConfirm.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    // Only two confirm calls: delete + cleanup (no close-PR since cleanup is off)
    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: false });
  });

  it('should default closePr to true with --force when feature has open PR', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force'], { from: 'user' });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true, closePr: true });
  });

  it('should not set closePr with --force when feature has no PR', async () => {
    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force'], { from: 'user' });

    expect(mockDeleteExecute).toHaveBeenCalledWith('feat-001', { cleanup: true });
  });

  // --- CLI summary tests (task-10) ---

  it('should include PR closure in summary when feature has open PR and closePr is true', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);
    // --force with open PR → closePr defaults to true
    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force'], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('PR'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('#42'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('closed'));
  });

  it('should not mention PR in summary when feature has no PR', async () => {
    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force'], { from: 'user' });

    const allLogCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat();
    const prLogCalls = allLogCalls.filter(
      (arg: unknown) => typeof arg === 'string' && arg.includes('PR')
    );
    expect(prLogCalls).toHaveLength(0);
  });

  it('should not mention PR closure when closePr is false', async () => {
    mockShowExecute.mockResolvedValue(mockFeatureWithOpenPr);
    mockDeleteExecute.mockResolvedValue(mockFeatureWithOpenPr);

    const cmd = createDelCommand();
    await cmd.parseAsync(['feat-001', '--force', '--no-close-pr'], { from: 'user' });

    const allLogCalls = (console.log as ReturnType<typeof vi.fn>).mock.calls.flat();
    const prClosedCalls = allLogCalls.filter(
      (arg: unknown) => typeof arg === 'string' && arg.includes('#42') && arg.includes('closed')
    );
    expect(prClosedCalls).toHaveLength(0);
  });
});
