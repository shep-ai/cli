'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Edge } from '@xyflow/react';
import { toast } from 'sonner';
import type {
  PrdApprovalPayload,
  QuestionSelectionChange,
} from '@shepai/core/domain/generated/output';
import { approveFeature } from '@/app/actions/approve-feature';
import { rejectFeature } from '@/app/actions/reject-feature';
import { getFeatureArtifact } from '@/app/actions/get-feature-artifact';
import { getResearchArtifact } from '@/app/actions/get-research-artifact';
import { getWorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import { getMergeReviewData } from '@/app/actions/get-merge-review-data';
import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import type { MergeReviewData } from '@/components/common/merge-review';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { FeatureDrawer, FeatureCreateDrawer } from '@/components/common';
import { PrdQuestionnaireDrawer } from '@/components/common/prd-questionnaire';
import type { PrdQuestionnaireData } from '@/components/common/prd-questionnaire';
import { TechDecisionsDrawer } from '@/components/common/tech-decisions-review';
import { MergeReviewDrawer } from '@/components/common/merge-review';
import { NotificationPermissionBanner } from '@/components/common/notification-permission-banner';
import { useSoundAction } from '@/hooks/use-sound-action';
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
    selectFeatureById,
    pendingParentFeatureId,
  } = useControlCenterState(initialNodes, initialEdges);

  // Extract feature list for the parent selector in the create drawer
  const featureOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === 'featureNode')
        .map((n) => {
          const data = n.data as FeatureNodeData;
          return { id: data.featureId, name: data.name };
        })
        .filter((f) => f.id && !f.id.startsWith('#')), // exclude optimistic temp nodes
    [nodes]
  );

  // Workflow defaults for the create-feature drawer
  const [workflowDefaults, setWorkflowDefaults] = useState<WorkflowDefaults | undefined>();
  useEffect(() => {
    getWorkflowDefaults()
      .then(setWorkflowDefaults)
      .catch(() => {
        // Settings unavailable — drawer falls back to all-false defaults
      });
  }, []);

  // PRD questionnaire drawer state
  const [prdSelections, setPrdSelections] = useState<Record<string, string>>({});
  const [questionnaireData, setQuestionnaireData] = useState<PrdQuestionnaireData | null>(null);
  const [isLoadingQuestionnaire, setIsLoadingQuestionnaire] = useState(false);

  // Reject state (shared by both drawers)
  const [isRejecting, setIsRejecting] = useState(false);
  const rejectSound = useSoundAction('reject');

  // Tech decisions drawer state
  const [techDecisionsData, setTechDecisionsData] = useState<TechDecisionsReviewData | null>(null);
  const [isLoadingTechDecisions, setIsLoadingTechDecisions] = useState(false);

  // Merge review drawer state
  const [mergeReviewData, setMergeReviewData] = useState<MergeReviewData | null>(null);
  const [isLoadingMergeReview, setIsLoadingMergeReview] = useState(false);

  const showPrdDrawer =
    selectedNode?.lifecycle === 'requirements' && selectedNode?.state === 'action-required';

  const showTechDecisionsDrawer =
    selectedNode?.lifecycle === 'implementation' && selectedNode?.state === 'action-required';

  const showMergeReviewDrawer =
    selectedNode?.lifecycle === 'review' && selectedNode?.state === 'action-required';

  const handlePrdSelect = useCallback((questionId: string, optionId: string) => {
    setPrdSelections((prev) => ({ ...prev, [questionId]: optionId }));
  }, []);

  const handlePrdApprove = useCallback(
    async (_actionId: string) => {
      const featureId = selectedNode?.featureId;
      if (!featureId) return;

      let payload: PrdApprovalPayload | undefined;
      if (questionnaireData) {
        const changedSelections: QuestionSelectionChange[] = [];
        for (const [questionId, optionId] of Object.entries(prdSelections)) {
          const question = questionnaireData.questions.find((q) => q.id === questionId);
          const option = question?.options.find((o) => o.id === optionId);
          if (question && option) {
            changedSelections.push({
              questionId: question.question,
              selectedOption: option.label,
            });
          }
        }
        payload = { approved: true, changedSelections };
      }

      const result = await approveFeature(featureId, payload);

      if (!result.approved) {
        toast.error(result.error ?? 'Failed to approve requirements');
        return;
      }

      toast.success('Requirements approved — agent resuming');
      clearSelection();
      setPrdSelections({});
    },
    [selectedNode?.featureId, clearSelection, questionnaireData, prdSelections]
  );

  // Shared reject handler — all drawers use the same rejectFeature flow
  const handleReject = useCallback(
    async (feedback: string, label: string, onDone?: () => void) => {
      const featureId = selectedNode?.featureId;
      if (!featureId) return;

      setIsRejecting(true);
      try {
        const result = await rejectFeature(featureId, feedback);

        if (!result.rejected) {
          toast.error(result.error ?? `Failed to reject ${label.toLowerCase()}`);
          return;
        }

        rejectSound.play();
        toast.success(`${label} rejected — agent re-iterating (iteration ${result.iteration})`);
        if (result.iterationWarning) {
          toast.warning(
            `Iteration ${result.iteration} — consider approving or adjusting feedback to avoid excessive iterations`
          );
        }
        clearSelection();
        onDone?.();
      } finally {
        setIsRejecting(false);
      }
    },
    [selectedNode?.featureId, clearSelection, rejectSound]
  );

  const handlePrdReject = useCallback(
    (feedback: string) => handleReject(feedback, 'Requirements', () => setPrdSelections({})),
    [handleReject]
  );

  const handleTechDecisionsReject = useCallback(
    (feedback: string) => handleReject(feedback, 'Plan'),
    [handleReject]
  );

  const handleMergeReject = useCallback(
    (feedback: string) => handleReject(feedback, 'Merge'),
    [handleReject]
  );

  // Shared approve handler — tech decisions and merge use identical approve flows
  const handleSimpleApprove = useCallback(
    async (label: string) => {
      const featureId = selectedNode?.featureId;
      if (!featureId) return;

      const result = await approveFeature(featureId);

      if (!result.approved) {
        toast.error(result.error ?? `Failed to approve ${label.toLowerCase()}`);
        return;
      }

      toast.success(`${label} approved — agent resuming`);
      clearSelection();
    },
    [selectedNode?.featureId, clearSelection]
  );

  const handleTechDecisionsApprove = useCallback(
    () => handleSimpleApprove('Plan'),
    [handleSimpleApprove]
  );

  const handleMergeApprove = useCallback(() => handleSimpleApprove('Merge'), [handleSimpleApprove]);

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

  // Fetch merge review data when a feature is in review + action-required
  const mergeFeatureId = showMergeReviewDrawer ? selectedNode?.featureId : null;
  useEffect(() => {
    setMergeReviewData(null);

    if (!mergeFeatureId) return;

    let cancelled = false;
    setIsLoadingMergeReview(true);
    getMergeReviewData(mergeFeatureId)
      .then((result) => {
        if (cancelled) return;
        if ('error' in result) {
          toast.error(result.error);
          return;
        }
        setMergeReviewData(result);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load merge review data');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMergeReview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mergeFeatureId]);

  const hasRepositories = nodes.some((n) => n.type === 'repositoryNode');

  // Listen for global "open create drawer" events from the sidebar
  useEffect(() => {
    const handler = () => handleAddFeature();
    window.addEventListener('shep:open-create-drawer', handler);
    return () => window.removeEventListener('shep:open-create-drawer', handler);
  }, [handleAddFeature]);

  // Listen for global "add repository" events from the top bar button
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent<{ path: string }>).detail.path;
      handleAddRepository(path);
    };
    window.addEventListener('shep:add-repository', handler);
    return () => window.removeEventListener('shep:add-repository', handler);
  }, [handleAddRepository]);

  // Listen for notification "Review" clicks to open the relevant drawer
  useEffect(() => {
    const handler = (e: Event) => {
      const featureId = (e as CustomEvent<{ featureId: string }>).detail.featureId;
      selectFeatureById(featureId);
    };
    window.addEventListener('shep:select-feature', handler);
    return () => window.removeEventListener('shep:select-feature', handler);
  }, [selectFeatureById]);

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
          workflowDefaults={workflowDefaults}
          features={featureOptions}
          initialParentId={pendingParentFeatureId}
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
        selectedNode={
          showPrdDrawer || showTechDecisionsDrawer || showMergeReviewDrawer ? null : selectedNode
        }
        onClose={clearSelection}
        onDelete={handleDeleteFeature}
        isDeleting={isDeleting}
      />
      {showPrdDrawer ? (
        <PrdQuestionnaireDrawer
          open
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
          onApprove={handlePrdApprove}
          onReject={handlePrdReject}
          isRejecting={isRejecting}
          onDelete={handleDeleteFeature}
          isDeleting={isDeleting}
          isProcessing={isLoadingQuestionnaire}
        />
      ) : null}
      {showTechDecisionsDrawer ? (
        <TechDecisionsDrawer
          open
          onClose={clearSelection}
          featureName={selectedNode?.name ?? ''}
          featureId={selectedNode?.featureId}
          repositoryPath={selectedNode?.repositoryPath}
          branch={selectedNode?.branch}
          specPath={selectedNode?.specPath}
          data={techDecisionsData}
          onApprove={handleTechDecisionsApprove}
          onReject={handleTechDecisionsReject}
          isRejecting={isRejecting}
          onDelete={handleDeleteFeature}
          isDeleting={isDeleting}
          isProcessing={isLoadingTechDecisions}
        />
      ) : null}
      {showMergeReviewDrawer ? (
        <MergeReviewDrawer
          open
          onClose={clearSelection}
          featureName={selectedNode?.name ?? ''}
          featureId={selectedNode?.featureId}
          repositoryPath={selectedNode?.repositoryPath}
          branch={selectedNode?.branch}
          specPath={selectedNode?.specPath}
          data={mergeReviewData}
          onApprove={handleMergeApprove}
          onReject={handleMergeReject}
          isRejecting={isRejecting}
          onDelete={handleDeleteFeature}
          isDeleting={isDeleting}
          isProcessing={isLoadingMergeReview}
        />
      ) : null}
      <FeatureCreateDrawer
        open={isCreateDrawerOpen}
        onClose={closeCreateDrawer}
        onSubmit={handleCreateFeatureSubmit}
        repositoryPath={pendingRepositoryPath}
        workflowDefaults={workflowDefaults}
        features={featureOptions}
        initialParentId={pendingParentFeatureId}
      />
    </>
  );
}
