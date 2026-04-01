import { describe, it, expect } from 'vitest';
import { buildTreeData } from '@/components/features/feature-tree-table';
import type { FeatureTreeRow } from '@/components/features/feature-tree-table';

function makeRow(overrides: Partial<FeatureTreeRow> & { id: string }): FeatureTreeRow {
  return {
    name: `Feature ${overrides.id}`,
    status: 'pending',
    lifecycle: 'Planning',
    branch: `feat/${overrides.id}`,
    repositoryName: 'test-repo',
    ...overrides,
  };
}

describe('buildTreeData', () => {
  it('returns flat list when no items have parentId', () => {
    const data = [makeRow({ id: 'a' }), makeRow({ id: 'b' }), makeRow({ id: 'c' })];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(3);
    expect(tree[0]._children).toBeUndefined();
    expect(tree[1]._children).toBeUndefined();
    expect(tree[2]._children).toBeUndefined();
  });

  it('nests child under parent when parentId matches', () => {
    const data = [makeRow({ id: 'parent' }), makeRow({ id: 'child', parentId: 'parent' })];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('parent');
    expect(tree[0]._children).toHaveLength(1);
    expect(tree[0]._children![0].id).toBe('child');
  });

  it('supports multi-level nesting', () => {
    const data = [
      makeRow({ id: 'root' }),
      makeRow({ id: 'child', parentId: 'root' }),
      makeRow({ id: 'grandchild', parentId: 'child' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    expect(tree[0]._children).toHaveLength(1);
    expect(tree[0]._children![0]._children).toHaveLength(1);
    expect(tree[0]._children![0]._children![0].id).toBe('grandchild');
  });

  it('treats orphaned children as roots when parent is missing', () => {
    const data = [makeRow({ id: 'orphan', parentId: 'nonexistent' }), makeRow({ id: 'root' })];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    const tree = buildTreeData([]);
    expect(tree).toEqual([]);
  });

  it('handles multiple children under one parent', () => {
    const data = [
      makeRow({ id: 'parent' }),
      makeRow({ id: 'child-1', parentId: 'parent' }),
      makeRow({ id: 'child-2', parentId: 'parent' }),
      makeRow({ id: 'child-3', parentId: 'parent' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(1);
    expect(tree[0]._children).toHaveLength(3);
  });

  it('handles mixed roots and children', () => {
    const data = [
      makeRow({ id: 'root-1' }),
      makeRow({ id: 'root-2' }),
      makeRow({ id: 'child-of-1', parentId: 'root-1' }),
      makeRow({ id: 'child-of-2', parentId: 'root-2' }),
    ];

    const tree = buildTreeData(data);

    expect(tree).toHaveLength(2);
    expect(tree[0]._children).toHaveLength(1);
    expect(tree[0]._children![0].id).toBe('child-of-1');
    expect(tree[1]._children).toHaveLength(1);
    expect(tree[1]._children![0].id).toBe('child-of-2');
  });
});
