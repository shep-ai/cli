/**
 * Feature List Command Unit Tests — Pending status display
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockListExecute, mockFindById, mockFindByFeatureId } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockListExecute: vi.fn(),
  mockFindById: vi.fn(),
  mockFindByFeatureId: vi.fn(),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('../../../../../../src/presentation/cli/ui/index.js', () => ({
  colors: {
    muted: (s: string) => `[muted:${s}]`,
    accent: (s: string) => s,
    success: (s: string) => s,
    brand: (s: string) => s,
    info: (s: string) => s,
    warning: (s: string) => `[warn:${s}]`,
    error: (s: string) => s,
  },
  symbols: {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    pointer: '❯',
    dotEmpty: '○',
    dot: '●',
    ellipsis: '…',
    spinner: ['⠋'],
  },
  messages: {
    newline: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
  renderListView: vi.fn(),
}));

import { createLsCommand } from '../../../../../../src/presentation/cli/commands/feat/ls.command.js';

function makeFeature(overrides: Record<string, unknown> = {}) {
  return {
    id: 'feat-001-uuid',
    name: 'Test Feature',
    branch: 'feat/test-feature',
    lifecycle: 'Requirements',
    repositoryPath: '/repos/myproject',
    agentRunId: null,
    parentId: null,
    push: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    ...overrides,
  };
}

describe('createLsCommand', () => {
  let renderListViewMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.exitCode = undefined as any;

    mockFindById.mockResolvedValue(null);
    mockFindByFeatureId.mockResolvedValue([]);

    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'ListFeaturesUseCase') return { execute: mockListExecute };
      if (key === 'IAgentRunRepository') return { findById: mockFindById };
      if (key === 'IPhaseTimingRepository') return { findByFeatureId: mockFindByFeatureId };
      return {};
    });

    const ui = await import('../../../../../../src/presentation/cli/ui/index.js');
    renderListViewMock = ui.renderListView as ReturnType<typeof vi.fn>;
  });

  it('should display Pending features with muted Pending status', async () => {
    const pendingFeature = makeFeature({ lifecycle: 'Pending' });
    mockListExecute.mockResolvedValue([pendingFeature]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(renderListViewMock).toHaveBeenCalledOnce();
    const { rows } = renderListViewMock.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    // Status column (index 2) should contain "Pending" with muted styling and dotEmpty symbol
    const statusCol = rows[0][2];
    expect(statusCol).toContain('Pending');
    expect(statusCol).toContain('[muted:○]');
    expect(statusCol).toContain('[muted:Pending]');
  });

  it('should display Pending features as roots even with parentId', async () => {
    const parentFeature = makeFeature({ id: 'parent-001', lifecycle: 'Implementation' });
    const pendingChildFeature = makeFeature({
      id: 'child-001',
      lifecycle: 'Pending',
      parentId: 'parent-001',
    });
    mockListExecute.mockResolvedValue([parentFeature, pendingChildFeature]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(renderListViewMock).toHaveBeenCalledOnce();
    const { rows } = renderListViewMock.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    // Both should be roots (no indent prefix "└")
    expect(rows[0][0]).not.toContain('└');
    expect(rows[1][0]).not.toContain('└');
  });

  it('should display Blocked features with warning styling distinct from Pending', async () => {
    const blockedFeature = makeFeature({ lifecycle: 'Blocked' });
    const pendingFeature = makeFeature({ id: 'feat-002', lifecycle: 'Pending' });
    mockListExecute.mockResolvedValue([blockedFeature, pendingFeature]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const { rows } = renderListViewMock.mock.calls[0][0];
    const blockedStatus = rows[0][2];
    const pendingStatus = rows[1][2];
    // Blocked uses warning styling, Pending uses muted
    expect(blockedStatus).toContain('[warn:');
    expect(blockedStatus).toContain('Blocked');
    expect(pendingStatus).toContain('[muted:');
    expect(pendingStatus).toContain('Pending');
    // They should be visually different
    expect(blockedStatus).not.toEqual(pendingStatus);
  });
});
