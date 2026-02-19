'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { approveFeature } from '@/app/actions/approve-feature';
import { getFeatureArtifact } from '@/app/actions/get-feature-artifact';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { FeatureDrawer, FeatureCreateDrawer } from '@/components/common';
import { PrdQuestionnaireDrawer } from '@/components/common/prd-questionnaire';
import type { PrdQuestionnaireData } from '@/components/common/prd-questionnaire';
import { ControlCenterEmptyState } from './control-center-empty-state';
import { useControlCenterState } from './use-control-center-state';

interface ControlCenterInnerProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
}

export function ControlCenterInner({ initialNodes, initialEdges }: ControlCenterInnerProps) {
  const {
    nodes,
    edges,
    selectedNode,
    isCreateDrawerOpen,
    isDeleting,
    pendingRepositoryPath,
    onNodesChange,
    handleConnect,
    handleAddFeature,
    handleAddFeatureToRepo,
    handleAddFeatureToFeature,
    handleAddRepository,
    handleNodeClick,
    clearSelection,
    handleCreateFeatureSubmit,
    handleDeleteFeature,
    closeCreateDrawer,
  } = useControlCenterState(initialNodes, initialEdges);

  // PRD questionnaire drawer state
  const [prdSelections, setPrdSelections] = useState<Record<string, string>>({});
  const [isPrdProcessing, setIsPrdProcessing] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<PrdQuestionnaireData | null>(null);
  const [isLoadingQuestionnaire, setIsLoadingQuestionnaire] = useState(false);

  const showPrdDrawer = selectedNode?.lifecycle === 'requirements';

  const handlePrdSelect = useCallback((questionId: string, optionId: string) => {
    setPrdSelections((prev) => ({ ...prev, [questionId]: optionId }));
  }, []);

  const handlePrdRefine = useCallback(async (_text: string) => {
    setIsPrdProcessing(true);
    // TODO: Call API to refine requirements
    // For now simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsPrdProcessing(false);
  }, []);

  const handlePrdApprove = useCallback(
    async (_actionId: string) => {
      const featureId = selectedNode?.featureId;
      if (!featureId) return;

      const result = await approveFeature(featureId);

      if (!result.approved) {
        toast.error(result.error ?? 'Failed to approve requirements');
        return;
      }

      toast.success('Requirements approved — agent resuming');
      clearSelection();
      setPrdSelections({});
    },
    [selectedNode?.featureId, clearSelection]
  );

  // Fetch questionnaire data and reset selections when a different feature is selected
  const prdFeatureId = showPrdDrawer ? selectedNode?.featureId : null;
  useEffect(() => {
    setPrdSelections({});
    setQuestionnaireData(null);

    if (!prdFeatureId) return;

    let cancelled = false;
    setIsLoadingQuestionnaire(true);
    getFeatureArtifact(prdFeatureId)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.questionnaire) {
          setQuestionnaireData(result.questionnaire);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load questionnaire');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingQuestionnaire(false);
      });

    return () => {
      cancelled = true;
    };
  }, [prdFeatureId]);

  // Listen for global "open create drawer" events from the sidebar
  useEffect(() => {
    const handler = () => handleAddFeature();
    window.addEventListener('shep:open-create-drawer', handler);
    return () => window.removeEventListener('shep:open-create-drawer', handler);
  }, [handleAddFeature]);

  return (
    <>
      <FeaturesCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={handleConnect}
        onAddFeature={handleAddFeature}
        onNodeAction={handleAddFeatureToFeature}
        onNodeClick={handleNodeClick}
        onPaneClick={clearSelection}
        onRepositoryAdd={handleAddFeatureToRepo}
        onRepositorySelect={handleAddRepository}
        emptyState={<ControlCenterEmptyState onRepositorySelect={handleAddRepository} />}
      />
      <FeatureDrawer
        selectedNode={showPrdDrawer ? null : selectedNode}
        onClose={clearSelection}
        onDelete={handleDeleteFeature}
        isDeleting={isDeleting}
      />
      {questionnaireData ? (
        <PrdQuestionnaireDrawer
          open={showPrdDrawer}
          onClose={clearSelection}
          featureName={selectedNode?.name ?? ''}
          featureId={selectedNode?.featureId}
          lifecycleLabel="REQUIREMENTS"
          data={questionnaireData}
          selections={prdSelections}
          onSelect={handlePrdSelect}
          onRefine={handlePrdRefine}
          onApprove={handlePrdApprove}
          onDelete={handleDeleteFeature}
          isDeleting={isDeleting}
          isProcessing={isPrdProcessing || isLoadingQuestionnaire}
        />
      ) : null}
      <FeatureCreateDrawer
        open={isCreateDrawerOpen}
        onClose={closeCreateDrawer}
        onSubmit={handleCreateFeatureSubmit}
        repositoryPath={pendingRepositoryPath}
      />
    </>
  );
}
