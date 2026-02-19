'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Edge } from '@xyflow/react';
import { toast } from 'sonner';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { FeatureDrawer, FeatureCreateDrawer } from '@/components/common';
import { PrdQuestionnaireDrawer } from '@/components/common/prd-questionnaire';
import type { PrdQuestion, PrdFinalAction } from '@/components/common/prd-questionnaire';
import { ControlCenterEmptyState } from './control-center-empty-state';
import { useControlCenterState } from './use-control-center-state';

// TODO: Replace with API fetch when endpoint is available
const mockQuestions: PrdQuestion[] = [
  {
    id: 'problem',
    question: 'What specific problem does this feature solve?',
    type: 'select',
    options: [
      {
        id: 'user_pain',
        label: 'User Pain Point',
        rationale: 'Addresses a recurring user complaint or friction',
        recommended: true,
      },
      { id: 'market_gap', label: 'Market Gap', rationale: 'Fills a gap vs competitors' },
      { id: 'tech_debt', label: 'Technical Debt', rationale: 'Reduces accumulated technical debt' },
      {
        id: 'compliance',
        label: 'Compliance',
        rationale: 'Meets regulatory or policy requirements',
      },
    ],
  },
  {
    id: 'priority',
    question: 'What is the business priority level?',
    type: 'select',
    options: [
      { id: 'p0', label: 'P0 - Critical', rationale: 'Blocking issue, must fix immediately' },
      {
        id: 'p1',
        label: 'P1 - High',
        rationale: 'Important for next release',
        recommended: true,
      },
      { id: 'p2', label: 'P2 - Medium', rationale: 'Nice to have, schedule when possible' },
      { id: 'p3', label: 'P3 - Low', rationale: 'Backlog item, no urgency' },
    ],
  },
  {
    id: 'success',
    question: 'What metrics define success?',
    type: 'select',
    options: [
      {
        id: 'adoption',
        label: 'Adoption Rate',
        rationale: 'Percentage of users who adopt the feature',
        recommended: true,
      },
      {
        id: 'performance',
        label: 'Performance',
        rationale: 'Latency, throughput, or resource improvements',
      },
      {
        id: 'revenue',
        label: 'Revenue Impact',
        rationale: 'Direct or indirect revenue contribution',
      },
      {
        id: 'satisfaction',
        label: 'User Satisfaction',
        rationale: 'NPS or CSAT score improvement',
      },
    ],
  },
  {
    id: 'timeline',
    question: 'What is the target timeline?',
    type: 'select',
    options: [
      {
        id: 'sprint',
        label: 'This Sprint',
        rationale: 'Deliverable within the current sprint',
        recommended: true,
      },
      { id: 'quarter', label: 'This Quarter', rationale: 'Target completion within 3 months' },
      { id: 'half', label: 'This Half', rationale: 'Target completion within 6 months' },
      { id: 'year', label: 'This Year', rationale: 'Long-term initiative for the year' },
    ],
  },
  {
    id: 'scope',
    question: 'What is the feature scope?',
    type: 'select',
    options: [
      {
        id: 'mvp',
        label: 'MVP',
        rationale: 'Minimum viable product — core functionality only',
        recommended: true,
      },
      {
        id: 'full',
        label: 'Full Feature',
        rationale: 'Complete feature with all planned capabilities',
      },
      { id: 'experiment', label: 'Experiment', rationale: 'A/B test or limited rollout' },
      {
        id: 'platform',
        label: 'Platform',
        rationale: 'Foundational work enabling future features',
      },
    ],
  },
  {
    id: 'stakeholders',
    question: 'Who are the primary stakeholders?',
    type: 'select',
    options: [
      {
        id: 'end_users',
        label: 'End Users',
        rationale: 'Direct users of the product',
        recommended: true,
      },
      {
        id: 'internal',
        label: 'Internal Teams',
        rationale: 'Engineering, product, or design teams',
      },
      {
        id: 'enterprise',
        label: 'Enterprise Clients',
        rationale: 'B2B customers with specific needs',
      },
      {
        id: 'partners',
        label: 'Partners',
        rationale: 'Third-party integrations or ecosystem partners',
      },
    ],
  },
];

const mockFinalAction: PrdFinalAction = {
  id: 'approve-reqs',
  label: 'Approve Requirements',
  description: 'Finalize and lock the requirements for implementation',
};

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

      try {
        const response = await fetch(`/api/features/${featureId}/approve`, {
          method: 'POST',
        });

        if (!response.ok) {
          const body = await response.json();
          toast.error(body.error ?? 'Failed to approve requirements');
          return;
        }

        toast.success('Requirements approved — agent resuming');
        clearSelection();
        setPrdSelections({});
      } catch {
        toast.error('Failed to approve requirements');
      }
    },
    [selectedNode?.featureId, clearSelection]
  );

  // Reset PRD selections when a different feature is selected
  const prdFeatureId = showPrdDrawer ? selectedNode?.featureId : null;
  useEffect(() => {
    setPrdSelections({});
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
      <PrdQuestionnaireDrawer
        open={selectedNode !== null && selectedNode.lifecycle === 'requirements'}
        onClose={clearSelection}
        featureName={selectedNode?.name ?? ''}
        featureId={selectedNode?.featureId}
        lifecycleLabel="REQUIREMENTS"
        question="Review Feature Requirements"
        context="Please review the AI-generated requirements below. Select the best option for each question, or ask the AI to refine them."
        questions={mockQuestions}
        selections={prdSelections}
        finalAction={mockFinalAction}
        onSelect={handlePrdSelect}
        onRefine={handlePrdRefine}
        onApprove={handlePrdApprove}
        isProcessing={isPrdProcessing}
      />
      <FeatureCreateDrawer
        open={isCreateDrawerOpen}
        onClose={closeCreateDrawer}
        onSubmit={handleCreateFeatureSubmit}
        repositoryPath={pendingRepositoryPath}
      />
    </>
  );
}
