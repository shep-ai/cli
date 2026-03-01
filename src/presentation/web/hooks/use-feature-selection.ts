'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { useSoundAction } from '@/hooks/use-sound-action';

export interface UseFeatureSelectionOptions {
  /** Features to search through when using selectFeatureById. */
  trackedFeatures?: FeatureNodeData[];
  /** Called when a feature is selected (via click or by ID) to close the create drawer. */
  onCreateDrawerClose?: () => void;
}

export interface UseFeatureSelectionResult {
  selectedNode: FeatureNodeData | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<FeatureNodeData | null>>;
  clearSelection: () => void;
  /** Select a feature by clicking on it. Ignores creating-state features. */
  handleNodeClick: (data: FeatureNodeData) => void;
  /** Find and select a feature by its featureId from the tracked features list. */
  selectFeatureById: (featureId: string) => void;
}

/**
 * Manages feature selection state shared across Board and Map views.
 *
 * Handles click-to-select, Escape-to-deselect, and programmatic selection
 * by feature ID. Creating-state features cannot be selected.
 */
export function useFeatureSelection(
  options?: UseFeatureSelectionOptions
): UseFeatureSelectionResult {
  const [selectedNode, setSelectedNode] = useState<FeatureNodeData | null>(null);
  const clickSound = useSoundAction('click');

  // Ref keeps latest tracked features so selectFeatureById has a stable identity
  const trackedFeaturesRef = useRef<FeatureNodeData[]>(options?.trackedFeatures ?? []);
  trackedFeaturesRef.current = options?.trackedFeatures ?? [];

  // Ref for onCreateDrawerClose callback to keep selectFeatureById stable
  const onCreateDrawerCloseRef = useRef(options?.onCreateDrawerClose);
  onCreateDrawerCloseRef.current = options?.onCreateDrawerClose;

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeClick = useCallback(
    (data: FeatureNodeData) => {
      if (data.state === 'creating') return;
      clickSound.play();
      onCreateDrawerCloseRef.current?.();
      setSelectedNode(data);
    },
    [clickSound]
  );

  // Keyboard shortcut: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

  const selectFeatureById = useCallback((featureId: string) => {
    const feature = trackedFeaturesRef.current.find((f) => f.featureId === featureId);
    if (feature && feature.state !== 'creating') {
      onCreateDrawerCloseRef.current?.();
      setSelectedNode(feature);
    }
  }, []);

  return {
    selectedNode,
    setSelectedNode,
    clearSelection,
    handleNodeClick,
    selectFeatureById,
  };
}
