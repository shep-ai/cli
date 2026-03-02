import { describe, it, expect } from 'vitest';
import type { Edge } from '@xyflow/react';
import { getDescendantIds } from '@/lib/get-descendant-ids';

describe('getDescendantIds', () => {
  it('returns direct children connected via dep-* edges', () => {
    const edges: Edge[] = [
      { id: 'dep-parent-child1', source: 'parent', target: 'child1' },
      { id: 'dep-parent-child2', source: 'parent', target: 'child2' },
    ];
    const result = getDescendantIds('parent', edges);
    expect(result).toEqual(new Set(['child1', 'child2']));
  });

  it('returns recursive descendants (3-level tree)', () => {
    const edges: Edge[] = [
      { id: 'dep-parent-child', source: 'parent', target: 'child' },
      { id: 'dep-child-grandchild', source: 'child', target: 'grandchild' },
    ];
    const result = getDescendantIds('parent', edges);
    expect(result).toEqual(new Set(['child', 'grandchild']));
  });

  it('returns empty Set for a leaf node with no children', () => {
    const edges: Edge[] = [{ id: 'dep-parent-child', source: 'parent', target: 'child' }];
    const result = getDescendantIds('child', edges);
    expect(result).toEqual(new Set());
  });

  it('only traverses dep-* edges, ignores edge-* edges', () => {
    const edges: Edge[] = [
      { id: 'dep-parent-child', source: 'parent', target: 'child' },
      { id: 'edge-parent-other', source: 'parent', target: 'other' },
    ];
    const result = getDescendantIds('parent', edges);
    expect(result).toEqual(new Set(['child']));
  });

  it('handles cycles gracefully without infinite loop', () => {
    const edges: Edge[] = [
      { id: 'dep-a-b', source: 'a', target: 'b' },
      { id: 'dep-b-c', source: 'b', target: 'c' },
      { id: 'dep-c-a', source: 'c', target: 'a' },
    ];
    const result = getDescendantIds('a', edges);
    expect(result).toEqual(new Set(['b', 'c']));
  });

  it('returns empty Set when no edges exist', () => {
    const result = getDescendantIds('parent', []);
    expect(result).toEqual(new Set());
  });

  it('handles deeply nested trees (4 levels)', () => {
    const edges: Edge[] = [
      { id: 'dep-a-b', source: 'a', target: 'b' },
      { id: 'dep-b-c', source: 'b', target: 'c' },
      { id: 'dep-c-d', source: 'c', target: 'd' },
    ];
    const result = getDescendantIds('a', edges);
    expect(result).toEqual(new Set(['b', 'c', 'd']));
  });

  it('handles a node with multiple branches of descendants', () => {
    const edges: Edge[] = [
      { id: 'dep-root-a', source: 'root', target: 'a' },
      { id: 'dep-root-b', source: 'root', target: 'b' },
      { id: 'dep-a-a1', source: 'a', target: 'a1' },
      { id: 'dep-b-b1', source: 'b', target: 'b1' },
      { id: 'dep-b-b2', source: 'b', target: 'b2' },
    ];
    const result = getDescendantIds('root', edges);
    expect(result).toEqual(new Set(['a', 'b', 'a1', 'b1', 'b2']));
  });

  it('does not include the parent node itself in results', () => {
    const edges: Edge[] = [{ id: 'dep-parent-child', source: 'parent', target: 'child' }];
    const result = getDescendantIds('parent', edges);
    expect(result.has('parent')).toBe(false);
  });
});
