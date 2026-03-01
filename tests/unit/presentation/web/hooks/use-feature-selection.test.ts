import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- Mocks ---

const mockPlay = vi.fn();
vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: () => ({ play: mockPlay, stop: vi.fn(), isPlaying: false }),
}));

import { useFeatureSelection } from '@/hooks/use-feature-selection';
import type { FeatureNodeData } from '@/components/common/feature-node';

const runningFeature: FeatureNodeData = {
  name: 'Auth Module',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 45,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
};

const creatingFeature: FeatureNodeData = {
  name: 'New Feature',
  featureId: '#c1',
  lifecycle: 'requirements',
  state: 'creating',
  progress: 0,
  repositoryPath: '/home/user/repo',
  branch: '',
};

const doneFeature: FeatureNodeData = {
  name: 'Dashboard',
  featureId: '#f2',
  lifecycle: 'maintain',
  state: 'done',
  progress: 100,
  repositoryPath: '/home/user/repo',
  branch: 'feat/dashboard',
};

describe('useFeatureSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining event listeners
  });

  it('initial selectedNode is null', () => {
    const { result } = renderHook(() => useFeatureSelection());
    expect(result.current.selectedNode).toBeNull();
  });

  describe('handleNodeClick', () => {
    it('sets selectedNode to the clicked feature data', () => {
      const onCreateDrawerClose = vi.fn();
      const { result } = renderHook(() => useFeatureSelection({ onCreateDrawerClose }));

      act(() => {
        result.current.handleNodeClick(runningFeature);
      });

      expect(result.current.selectedNode).toEqual(runningFeature);
    });

    it('plays click sound on selection', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.handleNodeClick(runningFeature);
      });

      expect(mockPlay).toHaveBeenCalled();
    });

    it('calls onCreateDrawerClose callback when selecting a feature', () => {
      const onCreateDrawerClose = vi.fn();
      const { result } = renderHook(() => useFeatureSelection({ onCreateDrawerClose }));

      act(() => {
        result.current.handleNodeClick(runningFeature);
      });

      expect(onCreateDrawerClose).toHaveBeenCalled();
    });

    it('ignores creating-state features', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.handleNodeClick(creatingFeature);
      });

      expect(result.current.selectedNode).toBeNull();
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('updates selectedNode when clicking a different feature', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.handleNodeClick(runningFeature);
      });
      expect(result.current.selectedNode).toEqual(runningFeature);

      act(() => {
        result.current.handleNodeClick(doneFeature);
      });
      expect(result.current.selectedNode).toEqual(doneFeature);
    });
  });

  describe('clearSelection', () => {
    it('sets selectedNode to null', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.handleNodeClick(runningFeature);
      });
      expect(result.current.selectedNode).not.toBeNull();

      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedNode).toBeNull();
    });
  });

  describe('setSelectedNode', () => {
    it('allows directly setting selectedNode', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.setSelectedNode(runningFeature);
      });

      expect(result.current.selectedNode).toEqual(runningFeature);
    });

    it('allows setting selectedNode to null', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.setSelectedNode(runningFeature);
      });

      act(() => {
        result.current.setSelectedNode(null);
      });

      expect(result.current.selectedNode).toBeNull();
    });
  });

  describe('Escape keydown', () => {
    it('calls clearSelection on Escape key', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.handleNodeClick(runningFeature);
      });
      expect(result.current.selectedNode).not.toBeNull();

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(result.current.selectedNode).toBeNull();
    });

    it('does not react to other keys', () => {
      const { result } = renderHook(() => useFeatureSelection());

      act(() => {
        result.current.handleNodeClick(runningFeature);
      });

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });

      expect(result.current.selectedNode).not.toBeNull();
    });
  });

  describe('selectFeatureById', () => {
    it('finds and selects a feature from the tracked list', () => {
      const features: FeatureNodeData[] = [runningFeature, doneFeature];
      const { result } = renderHook(() => useFeatureSelection({ trackedFeatures: features }));

      act(() => {
        result.current.selectFeatureById('#f2');
      });

      expect(result.current.selectedNode).toEqual(doneFeature);
    });

    it('does not select if featureId is not found', () => {
      const features: FeatureNodeData[] = [runningFeature];
      const { result } = renderHook(() => useFeatureSelection({ trackedFeatures: features }));

      act(() => {
        result.current.selectFeatureById('#nonexistent');
      });

      expect(result.current.selectedNode).toBeNull();
    });

    it('does not select creating-state features', () => {
      const features: FeatureNodeData[] = [creatingFeature];
      const { result } = renderHook(() => useFeatureSelection({ trackedFeatures: features }));

      act(() => {
        result.current.selectFeatureById('#c1');
      });

      expect(result.current.selectedNode).toBeNull();
    });

    it('calls onCreateDrawerClose when selecting by ID', () => {
      const onCreateDrawerClose = vi.fn();
      const features: FeatureNodeData[] = [runningFeature];
      const { result } = renderHook(() =>
        useFeatureSelection({ trackedFeatures: features, onCreateDrawerClose })
      );

      act(() => {
        result.current.selectFeatureById('#f1');
      });

      expect(onCreateDrawerClose).toHaveBeenCalled();
    });

    it('uses latest tracked features via ref (stable identity)', () => {
      const initialFeatures: FeatureNodeData[] = [runningFeature];
      const { result, rerender } = renderHook(
        ({ features }) => useFeatureSelection({ trackedFeatures: features }),
        { initialProps: { features: initialFeatures } }
      );

      // Update tracked features to include doneFeature
      const updatedFeatures: FeatureNodeData[] = [runningFeature, doneFeature];
      rerender({ features: updatedFeatures });

      // selectFeatureById should find the newly added feature
      act(() => {
        result.current.selectFeatureById('#f2');
      });

      expect(result.current.selectedNode).toEqual(doneFeature);
    });
  });
});
