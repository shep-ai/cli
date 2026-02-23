'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { approveFeature } from '@/app/actions/approve-feature';
import { getFeatureArtifact } from '@/app/actions/get-feature-artifact';
import { getResearchArtifact } from '@/app/actions/get-research-artifact';
import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { FeatureDrawer, FeatureCreateDrawer } from '@/components/common';
import { PrdQuestionnaireDrawer } from '@/components/common/prd-questionnaire';
import type { PrdQuestionnaireData } from '@/components/common/prd-questionnaire';
import { TechDecisionsDrawer } from '@/components/common/tech-decisions-review';
import { NotificationPermissionBanner } from '@/components/common/notification-permission-banner';
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
    handleDeleteRepository,
    closeCreateDrawer,
  } = useControlCenterState(initialNodes, initialEdges);

  // PRD questionnaire drawer state
  const [prdSelections, setPrdSelections] = useState<Record<string, string>>({});
  const [isPrdProcessing, setIsPrdProcessing] = useState(false);
  const [questionnaireData, setQuestionnaireData] = useState<PrdQuestionnaireData | null>(null);
  const [isLoadingQuestionnaire, setIsLoadingQuestionnaire] = useState(false);

  // Tech decisions drawer state
  const [techDecisionsData, setTechDecisionsData] = useState<TechDecisionsReviewData | null>(null);
  const [isLoadingTechDecisions, setIsLoadingTechDecisions] = useState(false);

  const showPrdDrawer =
    selectedNode?.lifecycle === 'requirements' && selectedNode?.state === 'action-required';

  const showTechDecisionsDrawer =
    selectedNode?.lifecycle === 'implementation' && selectedNode?.state === 'action-required';

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

  const handleTechDecisionsRefine = useCallback(async (_text: string) => {
    setIsLoadingTechDecisions(true);
    // TODO: Call API to refine tech decisions
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoadingTechDecisions(false);
  }, []);

  const handleTechDecisionsApprove = useCallback(async () => {
    const featureId = selectedNode?.featureId;
    if (!featureId) return;

    const result = await approveFeature(featureId);

    if (!result.approved) {
      toast.error(result.error ?? 'Failed to approve plan');
      return;
    }

    toast.success('Plan approved — agent resuming');
    clearSelection();
  }, [selectedNode?.featureId, clearSelection]);

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
          // Pre-select AI-recommended answers
          const defaults: Record<string, string> = {};
          for (const q of result.questionnaire.questions) {
            const recommended = q.options.find((o) => o.recommended);
            if (recommended) defaults[q.id] = recommended.id;
          }
          setPrdSelections(defaults);
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

  // Fetch tech decisions data when a feature is in research + action-required
  const techDecisionsFeatureId = showTechDecisionsDrawer ? selectedNode?.featureId : null;
  useEffect(() => {
    setTechDecisionsData(null);

    if (!techDecisionsFeatureId) return;

    let cancelled = false;
    setIsLoadingTechDecisions(true);
    getResearchArtifact(techDecisionsFeatureId)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.techDecisions) {
          setTechDecisionsData(result.techDecisions);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load tech decisions');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTechDecisions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [techDecisionsFeatureId]);

  const hasRepositories = nodes.some((n) => n.type === 'repositoryNode');

  // Listen for global "open create drawer" events from the sidebar
  useEffect(() => {
    const handler = () => handleAddFeature();
    window.addEventListener('shep:open-create-drawer', handler);
    return () => window.removeEventListener('shep:open-create-drawer', handler);
  }, [handleAddFeature]);

  if (!hasRepositories) {
    return (
      <>
        <NotificationPermissionBanner />
        <ControlCenterEmptyState onRepositorySelect={handleAddRepository} />
        <FeatureCreateDrawer
          open={isCreateDrawerOpen}
          onClose={closeCreateDrawer}
          onSubmit={handleCreateFeatureSubmit}
          repositoryPath={pendingRepositoryPath}
        />
      </>
    );
  }

  return (
    <>
      <NotificationPermissionBanner />
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
        onRepositoryDelete={handleDeleteRepository}
        onRepositorySelect={handleAddRepository}
        emptyState={<ControlCenterEmptyState onRepositorySelect={handleAddRepository} />}
      />
      <FeatureDrawer
        selectedNode={showPrdDrawer || showTechDecisionsDrawer ? null : selectedNode}
        onClose={clearSelection}
        onDelete={handleDeleteFeature}
        isDeleting={isDeleting}
      />
      {questionnaireData ? (
        <PrdQuestionnaireDrawer
          open={showPrdDrawer}
          onClose={clearSelection}
          featureName={selectedNode?.name ?? ''}
          featureDescription={selectedNode?.description}
          featureId={selectedNode?.featureId}
          repositoryPath={selectedNode?.repositoryPath}
          branch={selectedNode?.branch}
          specPath={selectedNode?.specPath}
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
      {techDecisionsData ? (
        <TechDecisionsDrawer
          open={showTechDecisionsDrawer}
          onClose={clearSelection}
          featureName={selectedNode?.name ?? ''}
          featureId={selectedNode?.featureId}
          repositoryPath={selectedNode?.repositoryPath}
          branch={selectedNode?.branch}
          specPath={selectedNode?.specPath}
          data={techDecisionsData}
          onRefine={handleTechDecisionsRefine}
          onApprove={handleTechDecisionsApprove}
          onDelete={handleDeleteFeature}
          isDeleting={isDeleting}
          isProcessing={isLoadingTechDecisions}
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
