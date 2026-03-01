import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { ReactNode } from 'react';

// --- Mocks ---

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: [],
    lastEvent: null,
    connectionStatus: 'connected' as const,
  }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: () => ({ play: vi.fn(), stop: vi.fn(), isPlaying: false }),
}));

vi.mock('@/app/actions/create-feature', () => ({
  createFeature: vi.fn().mockResolvedValue({ feature: { id: '1' } }),
}));

vi.mock('@/app/actions/delete-feature', () => ({
  deleteFeature: vi.fn().mockResolvedValue({ feature: { id: '1' } }),
}));

vi.mock('@/app/actions/add-repository', () => ({
  addRepository: vi.fn().mockResolvedValue({ repository: { id: '1', path: '/test' } }),
}));

vi.mock('@/app/actions/delete-repository', () => ({
  deleteRepository: vi.fn().mockResolvedValue({ success: true }),
}));

import {
  ControlCenterProvider,
  useControlCenterContext,
} from '@/components/features/control-center/control-center-provider';

const mockFeatureNode: FeatureNodeType = {
  id: 'feat-1',
  type: 'featureNode',
  position: { x: 100, y: 100 },
  data: {
    name: 'Auth Module',
    featureId: '#f1',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/auth-module',
  },
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <ControlCenterProvider initialNodes={[mockFeatureNode] as CanvasNodeType[]} initialEdges={[]}>
      {children}
    </ControlCenterProvider>
  );
}

describe('ControlCenterProvider', () => {
  it('useControlCenterContext throws outside provider', () => {
    // Suppress console.error from the expected React error boundary
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useControlCenterContext());
    }).toThrow('useControlCenterContext must be used within a <ControlCenterProvider>');

    spy.mockRestore();
  });

  it('provides selectedNode from useFeatureSelection', () => {
    function Consumer() {
      const ctx = useControlCenterContext();
      return <div data-testid="selected">{ctx.selectedNode?.name ?? 'null'}</div>;
    }

    render(
      <ControlCenterProvider initialNodes={[mockFeatureNode] as CanvasNodeType[]} initialEdges={[]}>
        <Consumer />
      </ControlCenterProvider>
    );

    expect(screen.getByTestId('selected')).toHaveTextContent('null');
  });

  it('exposes optimistic update handlers', () => {
    const { result } = renderHook(() => useControlCenterContext(), { wrapper });

    expect(result.current.handleCreateFeatureSubmit).toBeDefined();
    expect(result.current.handleDeleteFeature).toBeDefined();
    expect(result.current.handleDeleteRepository).toBeDefined();
    expect(result.current.handleAddRepository).toBeDefined();
    expect(result.current.isDeleting).toBe(false);
  });

  it('child component can update selection through context', () => {
    function Consumer() {
      const ctx = useControlCenterContext();
      return (
        <>
          <div data-testid="selected">{ctx.selectedNode?.name ?? 'null'}</div>
          <button
            data-testid="select-btn"
            onClick={() => ctx.handleNodeClick(mockFeatureNode.data)}
          >
            Select
          </button>
          <button data-testid="clear-btn" onClick={ctx.clearSelection}>
            Clear
          </button>
        </>
      );
    }

    render(
      <ControlCenterProvider initialNodes={[mockFeatureNode] as CanvasNodeType[]} initialEdges={[]}>
        <Consumer />
      </ControlCenterProvider>
    );

    expect(screen.getByTestId('selected')).toHaveTextContent('null');

    act(() => {
      screen.getByTestId('select-btn').click();
    });

    expect(screen.getByTestId('selected')).toHaveTextContent('Auth Module');

    act(() => {
      screen.getByTestId('clear-btn').click();
    });

    expect(screen.getByTestId('selected')).toHaveTextContent('null');
  });

  it('exposes canvas state (nodes, edges)', () => {
    const { result } = renderHook(() => useControlCenterContext(), { wrapper });

    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.edges).toHaveLength(0);
  });
});
