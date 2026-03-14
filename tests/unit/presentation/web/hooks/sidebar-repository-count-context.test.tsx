import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  SidebarRepositoryCountProvider,
  useSidebarRepositoryCount,
} from '../../../../../src/presentation/web/hooks/sidebar-repository-count-context';

describe('SidebarRepositoryCountContext', () => {
  function wrapper({ children }: { children: ReactNode }) {
    return <SidebarRepositoryCountProvider>{children}</SidebarRepositoryCountProvider>;
  }

  it('throws when useSidebarRepositoryCount is called outside provider', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSidebarRepositoryCount())).toThrow(
      'useSidebarRepositoryCount must be used within a <SidebarRepositoryCountProvider>'
    );
    spy.mockRestore();
  });

  it('provides default repository count of 0', () => {
    const { result } = renderHook(() => useSidebarRepositoryCount(), { wrapper });

    expect(result.current.repositoryCount).toBe(0);
  });

  it('updates count when setRepositoryCount is called', () => {
    const { result } = renderHook(() => useSidebarRepositoryCount(), { wrapper });

    act(() => {
      result.current.setRepositoryCount(3);
    });

    expect(result.current.repositoryCount).toBe(3);
  });

  it('re-renders consumers when count changes', () => {
    const { result } = renderHook(() => useSidebarRepositoryCount(), { wrapper });

    expect(result.current.repositoryCount).toBe(0);

    act(() => {
      result.current.setRepositoryCount(5);
    });

    expect(result.current.repositoryCount).toBe(5);

    act(() => {
      result.current.setRepositoryCount(0);
    });

    expect(result.current.repositoryCount).toBe(0);
  });
});
