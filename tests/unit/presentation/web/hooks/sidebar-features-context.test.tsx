import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  mapNodeStateToSidebarStatus,
  SidebarFeaturesProvider,
  useSidebarFeaturesContext,
} from '../../../../../src/presentation/web/hooks/sidebar-features-context';
import type { FeatureNodeState } from '@/components/common/feature-node/feature-node-state-config';
import type { FeatureStatus } from '@/components/common/feature-status-config';

// ---------------------------------------------------------------------------
// mapNodeStateToSidebarStatus — pure mapping function
// ---------------------------------------------------------------------------
describe('mapNodeStateToSidebarStatus', () => {
  it.each<[FeatureNodeState, FeatureStatus | null]>([
    ['action-required', 'action-needed'],
    ['running', 'in-progress'],
    ['done', 'done'],
    ['blocked', 'in-progress'],
    ['error', 'in-progress'],
    ['creating', null],
  ])('maps %s → %s', (input, expected) => {
    expect(mapNodeStateToSidebarStatus(input)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// SidebarFeaturesContext — provider + hook
// ---------------------------------------------------------------------------
describe('SidebarFeaturesContext', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <SidebarFeaturesProvider>{children}</SidebarFeaturesProvider>;
  }

  it('throws when useSidebarFeaturesContext is called outside provider', () => {
    // Suppress React error boundary console output
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSidebarFeaturesContext())).toThrow(
      'useSidebarFeaturesContext must be used within a <SidebarFeaturesProvider>'
    );
    spy.mockRestore();
  });

  it('provides an empty features array by default', () => {
    const { result } = renderHook(() => useSidebarFeaturesContext(), { wrapper });

    expect(result.current.features).toEqual([]);
  });

  it('updates features when setFeatures is called', () => {
    const { result } = renderHook(() => useSidebarFeaturesContext(), { wrapper });

    act(() => {
      result.current.setFeatures([
        { name: 'Login', status: 'in-progress' as const, featureId: 'f-1' },
      ]);
    });

    expect(result.current.features).toEqual([
      { name: 'Login', status: 'in-progress', featureId: 'f-1' },
    ]);
  });

  it('re-renders consumers when features change', () => {
    const { result } = renderHook(() => useSidebarFeaturesContext(), { wrapper });

    expect(result.current.features).toHaveLength(0);

    act(() => {
      result.current.setFeatures([
        { name: 'A', status: 'done' as const, featureId: 'f-a', duration: '1h' },
        { name: 'B', status: 'action-needed' as const, featureId: 'f-b' },
      ]);
    });

    expect(result.current.features).toHaveLength(2);
    expect(result.current.features[0].name).toBe('A');
    expect(result.current.features[1].name).toBe('B');
  });
});
