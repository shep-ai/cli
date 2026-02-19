/**
 * Feature Logs Command Unit Tests
 *
 * Tests for the `shep feat logs <id>` command.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShowExecute = vi.fn();
const mockViewLog = vi.fn();

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: () => ({ execute: mockShowExecute }),
  },
}));

vi.mock('@/application/use-cases/features/show-feature.use-case.js', () => ({
  ShowFeatureUseCase: class {
    execute = mockShowExecute;
  },
}));

vi.mock('../../../../../../src/presentation/cli/commands/log-viewer.js', () => ({
  viewLog: (...args: unknown[]) => mockViewLog(...args),
}));

vi.mock('@/infrastructure/services/filesystem/shep-directory.service.js', () => ({
  getShepHomeDir: () => '/home/test/.shep',
}));

import { createLogsCommand } from '../../../../../../src/presentation/cli/commands/feat/logs.command.js';

const mockError = vi.fn();
vi.spyOn(console, 'log').mockImplementation(() => undefined);
vi.spyOn(console, 'error').mockImplementation(() => undefined);

vi.mock('../../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: {
    error: (...args: unknown[]) => mockError(...args),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  colors: { accent: (s: string) => s, muted: (s: string) => s },
}));

function makeFeature(overrides?: Record<string, unknown>) {
  return {
    id: 'feat-001',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    repositoryPath: '/repo',
    branch: 'feat/test',
    lifecycle: 'Implementation',
    messages: [],
    relatedArtifacts: [],
    agentRunId: 'run-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('createLogsCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined as any;
  });

  it('calls viewLog with correct log path and options', async () => {
    const feature = makeFeature();
    mockShowExecute.mockResolvedValue(feature);
    mockViewLog.mockResolvedValue(true);

    const cmd = createLogsCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockShowExecute).toHaveBeenCalledWith('feat-001');
    expect(mockViewLog).toHaveBeenCalledWith(
      expect.objectContaining({
        logPath: expect.stringContaining('worker-run-001.log'),
        follow: undefined,
        lines: 0,
        label: 'feature "Test Feature"',
      })
    );
  });

  it('passes follow option through', async () => {
    mockShowExecute.mockResolvedValue(makeFeature());
    mockViewLog.mockResolvedValue(true);

    const cmd = createLogsCommand();
    await cmd.parseAsync(['-f', 'feat-001'], { from: 'user' });

    expect(mockViewLog).toHaveBeenCalledWith(expect.objectContaining({ follow: true }));
  });

  it('passes lines option through', async () => {
    mockShowExecute.mockResolvedValue(makeFeature());
    mockViewLog.mockResolvedValue(true);

    const cmd = createLogsCommand();
    await cmd.parseAsync(['-n', '50', 'feat-001'], { from: 'user' });

    expect(mockViewLog).toHaveBeenCalledWith(expect.objectContaining({ lines: 50 }));
  });

  it('errors when feature has no agent run', async () => {
    mockShowExecute.mockResolvedValue(makeFeature({ agentRunId: null }));

    const cmd = createLogsCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(mockError).toHaveBeenCalledWith(expect.stringContaining('has no agent run'));
    expect(process.exitCode).toBe(1);
    expect(mockViewLog).not.toHaveBeenCalled();
  });

  it('sets exitCode when viewLog returns false', async () => {
    mockShowExecute.mockResolvedValue(makeFeature());
    mockViewLog.mockResolvedValue(false);

    const cmd = createLogsCommand();
    await cmd.parseAsync(['feat-001'], { from: 'user' });

    expect(process.exitCode).toBe(1);
  });

  it('handles ShowFeatureUseCase throwing', async () => {
    mockShowExecute.mockRejectedValue(new Error('Feature not found: "bad-id"'));

    const cmd = createLogsCommand();
    await cmd.parseAsync(['bad-id'], { from: 'user' });

    expect(mockError).toHaveBeenCalledWith('Failed to read feature logs', expect.any(Error));
    expect(process.exitCode).toBe(1);
  });
});
