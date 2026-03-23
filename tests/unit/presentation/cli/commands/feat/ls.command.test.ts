/**
 * Feature List Command Unit Tests — hierarchical tree view
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockListExecute, mockFindById, mockFindByFeatureId, mockRepoList } =
  vi.hoisted(() => ({
    mockResolve: vi.fn(),
    mockListExecute: vi.fn(),
    mockFindById: vi.fn(),
    mockFindByFeatureId: vi.fn(),
    mockRepoList: vi.fn(),
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
  fmt: {
    heading: (s: string) => `[heading:${s}]`,
    code: (s: string) => s,
    label: (s: string) => s,
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
import {
  buildTree,
  groupByRepo,
  flattenTree,
  buildTreePrefix,
  toTimestamp,
} from '../../../../../../src/presentation/cli/commands/feat/ls.command.js';

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
    createdAt: new Date('2024-01-01T00:00:00Z'),
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    ...overrides,
  };
}

function makeEntry(featureOverrides: Record<string, unknown> = {}) {
  return {
    feature: makeFeature(featureOverrides) as any,
    run: null,
    phases: [],
  };
}

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    id: 'repo-001',
    name: 'myproject',
    path: '/repos/myproject',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('createLsCommand', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.exitCode = undefined as any;

    mockFindById.mockResolvedValue(null);
    mockFindByFeatureId.mockResolvedValue([]);
    mockRepoList.mockResolvedValue([makeRepo()]);

    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'string' ? token : (token as { name?: string })?.name;
      if (key === 'ListFeaturesUseCase') return { execute: mockListExecute };
      if (key === 'IAgentRunRepository') return { findById: mockFindById };
      if (key === 'IPhaseTimingRepository') return { findByFeatureId: mockFindByFeatureId };
      if (key === 'IRepositoryRepository') return { list: mockRepoList };
      return {};
    });

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('should display Pending features with muted Pending status', async () => {
    const pendingFeature = makeFeature({ lifecycle: 'Pending' });
    mockListExecute.mockResolvedValue([pendingFeature]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[muted:○]');
    expect(output).toContain('[muted:Pending]');
  });

  it('should display Pending features as children when they have a parentId', async () => {
    const parentFeature = makeFeature({
      id: 'parent-001',
      lifecycle: 'Implementation',
      createdAt: new Date('2024-01-02T00:00:00Z'),
    });
    const pendingChildFeature = makeFeature({
      id: 'child-001',
      lifecycle: 'Pending',
      parentId: 'parent-001',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    });
    mockListExecute.mockResolvedValue([parentFeature, pendingChildFeature]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const output = consoleSpy.mock.calls[0][0] as string;
    // Parent should appear with a root-level tree prefix
    expect(output).toContain('└─');
    // Child should appear indented (has Pending)
    expect(output).toContain('[muted:Pending]');
  });

  it('should display Blocked features with warning styling distinct from Pending', async () => {
    const blockedFeature = makeFeature({
      id: 'feat-blocked',
      lifecycle: 'Blocked',
      createdAt: new Date('2024-01-02T00:00:00Z'),
    });
    const pendingFeature = makeFeature({
      id: 'feat-pending',
      lifecycle: 'Pending',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    });
    mockListExecute.mockResolvedValue([blockedFeature, pendingFeature]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[warn:○]');
    expect(output).toContain('[warn:Blocked]');
    expect(output).toContain('[muted:Pending]');
  });

  it('should not pass includeArchived by default', async () => {
    mockListExecute.mockResolvedValue([]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockListExecute).toHaveBeenCalledWith(undefined);
  });

  it('should pass includeArchived: true when --show-archived is provided', async () => {
    mockListExecute.mockResolvedValue([]);

    const cmd = createLsCommand();
    await cmd.parseAsync(['--show-archived'], { from: 'user' });

    expect(mockListExecute).toHaveBeenCalledWith(
      expect.objectContaining({ includeArchived: true })
    );
  });

  it('should display Archived features with muted styling', async () => {
    const archivedFeature = makeFeature({ lifecycle: 'Archived' });
    mockListExecute.mockResolvedValue([archivedFeature]);

    const cmd = createLsCommand();
    await cmd.parseAsync(['--show-archived'], { from: 'user' });

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('[muted:○]');
    expect(output).toContain('[muted:Archived]');
  });

  it('should show repo name as section header', async () => {
    const feature = makeFeature();
    mockListExecute.mockResolvedValue([feature]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('myproject');
    expect(output).toContain('/repos/myproject');
  });

  it('should show empty message when no features', async () => {
    mockListExecute.mockResolvedValue([]);
    const { messages: mockMessages } = await import(
      '../../../../../../src/presentation/cli/ui/index.js'
    );

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockMessages.info).toHaveBeenCalledWith('No features found');
  });

  it('should group features from different repos into separate sections', async () => {
    const feat1 = makeFeature({
      id: 'feat-001',
      repositoryPath: '/repos/alpha',
      createdAt: new Date('2024-01-02T00:00:00Z'),
    });
    const feat2 = makeFeature({
      id: 'feat-002',
      repositoryPath: '/repos/beta',
      createdAt: new Date('2024-01-01T00:00:00Z'),
    });
    mockListExecute.mockResolvedValue([feat1, feat2]);
    mockRepoList.mockResolvedValue([
      makeRepo({
        path: '/repos/alpha',
        name: 'alpha',
        createdAt: new Date('2024-01-02T00:00:00Z'),
      }),
      makeRepo({
        id: 'repo-002',
        path: '/repos/beta',
        name: 'beta',
        createdAt: new Date('2024-01-01T00:00:00Z'),
      }),
    ]);

    const cmd = createLsCommand();
    await cmd.parseAsync([], { from: 'user' });

    const output = consoleSpy.mock.calls[0][0] as string;
    expect(output).toContain('/repos/alpha');
    expect(output).toContain('/repos/beta');
    // alpha repo is newer so it should come first
    const alphaPos = output.indexOf('/repos/alpha');
    const betaPos = output.indexOf('/repos/beta');
    expect(alphaPos).toBeLessThan(betaPos);
  });
});

// ─── Pure function unit tests ─────────────────────────────────────────────────

describe('toTimestamp', () => {
  it('returns 0 for falsy values', () => {
    expect(toTimestamp(null)).toBe(0);
    expect(toTimestamp(undefined)).toBe(0);
    expect(toTimestamp('')).toBe(0);
  });

  it('parses date strings', () => {
    const ts = toTimestamp('2024-01-01T00:00:00Z');
    expect(ts).toBe(new Date('2024-01-01T00:00:00Z').getTime());
  });
});

describe('buildTree', () => {
  it('returns all entries as roots when none have parentId', () => {
    const entries = [
      makeEntry({ id: 'a', createdAt: new Date('2024-01-01') }),
      makeEntry({ id: 'b', createdAt: new Date('2024-01-02') }),
    ];
    const tree = buildTree(entries);
    expect(tree).toHaveLength(2);
    // sorted desc: b first
    expect(tree[0].entry.feature.id).toBe('b');
    expect(tree[1].entry.feature.id).toBe('a');
  });

  it('nests children under their parent', () => {
    const parent = makeEntry({ id: 'parent-1', createdAt: new Date('2024-01-02') });
    const child = makeEntry({
      id: 'child-1',
      parentId: 'parent-1',
      createdAt: new Date('2024-01-01'),
    });
    const tree = buildTree([parent, child]);
    expect(tree).toHaveLength(1);
    expect(tree[0].entry.feature.id).toBe('parent-1');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].entry.feature.id).toBe('child-1');
  });

  it('handles orphaned children (parent not in list) as roots', () => {
    const orphan = makeEntry({ id: 'orphan', parentId: 'missing-parent' });
    const tree = buildTree([orphan]);
    expect(tree).toHaveLength(1);
    expect(tree[0].entry.feature.id).toBe('orphan');
  });

  it('sorts children by createdAt desc', () => {
    const parent = makeEntry({ id: 'p', createdAt: new Date('2024-01-10') });
    const child1 = makeEntry({ id: 'c1', parentId: 'p', createdAt: new Date('2024-01-01') });
    const child2 = makeEntry({ id: 'c2', parentId: 'p', createdAt: new Date('2024-01-03') });
    const tree = buildTree([parent, child1, child2]);
    const kids = tree[0].children;
    expect(kids[0].entry.feature.id).toBe('c2');
    expect(kids[1].entry.feature.id).toBe('c1');
  });
});

describe('groupByRepo', () => {
  it('groups features by repositoryPath', () => {
    const e1 = makeEntry({ repositoryPath: '/repos/a', createdAt: new Date('2024-01-01') });
    const e2 = makeEntry({
      id: 'feat-002',
      repositoryPath: '/repos/b',
      createdAt: new Date('2024-01-02'),
    });
    const repos = [
      makeRepo({ path: '/repos/a', createdAt: new Date('2024-01-01') }),
      makeRepo({ id: 'r2', path: '/repos/b', createdAt: new Date('2024-01-02') }),
    ];
    const groups = groupByRepo([e1, e2], repos as any);
    expect(groups).toHaveLength(2);
    // /repos/b repo is newer → comes first
    expect(groups[0].repoPath).toBe('/repos/b');
    expect(groups[1].repoPath).toBe('/repos/a');
  });

  it('falls back to newest feature createdAt when repo entity not found', () => {
    const e1 = makeEntry({ repositoryPath: '/repos/unknown', createdAt: new Date('2024-06-01') });
    const groups = groupByRepo([e1], []);
    expect(groups).toHaveLength(1);
    expect(groups[0].repoName).toBe('unknown');
  });

  it('normalizes Windows backslash paths', () => {
    const e1 = makeEntry({
      repositoryPath: 'C:\\repos\\myproject',
      createdAt: new Date('2024-01-01'),
    });
    const repos = [makeRepo({ path: 'C:/repos/myproject', createdAt: new Date('2024-01-01') })];
    const groups = groupByRepo([e1], repos as any);
    expect(groups).toHaveLength(1);
  });
});

describe('flattenTree', () => {
  it('returns flat list of root nodes with no parentIsLast', () => {
    const tree: any[] = [
      { entry: makeEntry({ id: 'a' }), children: [] },
      { entry: makeEntry({ id: 'b' }), children: [] },
    ];
    const flat = flattenTree(tree, []);
    expect(flat).toHaveLength(2);
    expect(flat[0].parentIsLast).toEqual([]);
    expect(flat[0].isLast).toBe(false);
    expect(flat[1].isLast).toBe(true);
  });

  it('includes children after their parent with correct depth context', () => {
    const tree: any[] = [
      {
        entry: makeEntry({ id: 'parent' }),
        children: [{ entry: makeEntry({ id: 'child' }), children: [] }],
      },
    ];
    const flat = flattenTree(tree, []);
    expect(flat).toHaveLength(2);
    expect(flat[1].entry.feature.id).toBe('child');
    expect(flat[1].parentIsLast).toEqual([true]); // parent was last
    expect(flat[1].isLast).toBe(true);
  });
});

describe('buildTreePrefix', () => {
  it('generates └─ for last root node', () => {
    expect(buildTreePrefix([], true)).toBe('└─ ');
  });

  it('generates ├─ for non-last root node', () => {
    expect(buildTreePrefix([], false)).toBe('├─ ');
  });

  it('generates │  └─ for last child of non-last parent', () => {
    expect(buildTreePrefix([false], true)).toBe('│  └─ ');
  });

  it('generates    └─ for last child of last parent', () => {
    expect(buildTreePrefix([true], true)).toBe('   └─ ');
  });

  it('generates │  │  ├─ for non-last grandchild of non-last parent chain', () => {
    expect(buildTreePrefix([false, false], false)).toBe('│  │  ├─ ');
  });
});
