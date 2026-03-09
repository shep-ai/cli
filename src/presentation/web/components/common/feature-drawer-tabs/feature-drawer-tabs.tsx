'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getFeaturePhaseTimings } from '@/app/actions/get-feature-phase-timings';
import type {
  PhaseTimingData,
  RejectionFeedbackData,
} from '@/app/actions/get-feature-phase-timings';
import { getFeaturePlan } from '@/app/actions/get-feature-plan';
import type { PlanData } from '@/app/actions/get-feature-plan';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { PrdQuestionnaireData } from '@/components/common/prd-questionnaire';
import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import type { ProductDecisionsSummaryData } from '@/components/common/product-decisions-summary';
import type { MergeReviewData } from '@/components/common/merge-review';
import { PrdQuestionnaire } from '@/components/common/prd-questionnaire';
import { TechDecisionsContent } from '@/components/common/tech-decisions-review';
import { ProductDecisionsSummary } from '@/components/common/product-decisions-summary';
import { MergeReview } from '@/components/common/merge-review';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';
import type { RejectAttachment } from '@/components/common/drawer-action-bar';
import { OverviewTab } from './overview-tab';
import { ActivityTab } from './activity-tab';
import { LogTab } from './log-tab';
import { PlanTab } from './plan-tab';
import { useFeatureLogs } from '@/hooks/use-feature-logs';
import { useTabDataFetch } from './use-tab-data-fetch';
import type { TabFetchers } from './use-tab-data-fetch';
import type { FeatureTabKey } from '@/components/common/control-center-drawer/drawer-view';

/** Lazy-loaded tab keys (tabs that fetch data on activation). */
type LazyTabKey = 'activity' | 'plan';

/** Tab definition for rendering the tab list dynamically. */
interface TabDef {
  key: FeatureTabKey;
  label: string;
}

/** All possible tabs in display order. */
const ALL_TABS: TabDef[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'log', label: 'Log' },
  { key: 'plan', label: 'Plan' },
  { key: 'prd-review', label: 'PRD Review' },
  { key: 'tech-decisions', label: 'Tech Decisions' },
  { key: 'product-decisions', label: 'Product' },
  { key: 'merge-review', label: 'Merge Review' },
];

/** Phases where a plan exists (planning happens at start of implementation). */
const PLAN_PHASES = new Set(['implementation', 'review', 'deploy', 'maintain']);

/** Compute which tabs are visible based on feature lifecycle + state. */
function computeVisibleTabs(node: FeatureNodeData): FeatureTabKey[] {
  const tabs: FeatureTabKey[] = ['overview', 'activity', 'log'];

  if (
    PLAN_PHASES.has(node.lifecycle) &&
    !(node.lifecycle === 'implementation' && node.state === 'action-required')
  ) {
    tabs.push('plan');
  }
  if (node.lifecycle === 'requirements' && node.state === 'action-required') {
    tabs.push('prd-review');
  }
  if (node.lifecycle === 'implementation' && node.state === 'action-required') {
    tabs.push('tech-decisions', 'product-decisions');
  }
  if (node.lifecycle === 'review' && (node.state === 'action-required' || node.state === 'error')) {
    tabs.push('merge-review');
  }

  return tabs;
}

export interface FeatureDrawerTabsProps {
  featureNode: FeatureNodeData;
  featureId: string;
  initialTab?: FeatureTabKey;

  // PRD review
  prdData?: PrdQuestionnaireData | null;
  prdSelections?: Record<string, string>;
  onPrdSelect?: (questionId: string, optionId: string) => void;
  onPrdApprove?: (actionId: string) => void;
  onPrdReject?: (feedback: string, attachments: RejectAttachment[]) => void;
  isPrdLoading?: boolean;

  // Tech decisions
  techData?: TechDecisionsReviewData | null;
  onTechApprove?: () => void;
  onTechReject?: (feedback: string, attachments: RejectAttachment[]) => void;
  isTechLoading?: boolean;

  // Product decisions
  productData?: ProductDecisionsSummaryData | null;

  // Merge review
  mergeData?: MergeReviewData | null;
  onMergeApprove?: () => void;
  onMergeReject?: (feedback: string, attachments: RejectAttachment[]) => void;
  isMergeLoading?: boolean;

  // Shared
  isRejecting?: boolean;
  chatInput?: string;
  onChatInputChange?: (value: string) => void;
}

interface ActivityData {
  timings: PhaseTimingData[];
  rejectionFeedback: RejectionFeedbackData[];
}

async function fetchActivity(featureId: string): Promise<ActivityData> {
  const result = await getFeaturePhaseTimings(featureId);
  if ('error' in result) throw new Error(result.error);
  return { timings: result.timings, rejectionFeedback: result.rejectionFeedback };
}

async function fetchPlan(featureId: string): Promise<PlanData | undefined> {
  const result = await getFeaturePlan(featureId);
  if ('error' in result) throw new Error(result.error);
  return result.plan;
}

const TAB_FETCHERS: TabFetchers<LazyTabKey> = {
  activity: fetchActivity,
  plan: fetchPlan,
};

export function FeatureDrawerTabs({
  featureNode,
  featureId,
  initialTab,
  prdData,
  prdSelections,
  onPrdSelect,
  onPrdApprove,
  onPrdReject,
  isPrdLoading,
  techData,
  onTechApprove,
  onTechReject,
  isTechLoading,
  productData,
  mergeData,
  onMergeApprove,
  onMergeReject,
  isMergeLoading,
  isRejecting,
  chatInput,
  onChatInputChange,
}: FeatureDrawerTabsProps) {
  const featureLogs = useFeatureLogs(featureId);

  const visibleTabs = useMemo(() => computeVisibleTabs(featureNode), [featureNode]);
  const visibleTabDefs = useMemo(
    () => ALL_TABS.filter((t) => visibleTabs.includes(t.key)),
    [visibleTabs]
  );

  // Use initialTab if it's visible, otherwise default to 'overview'
  const effectiveInitial = initialTab && visibleTabs.includes(initialTab) ? initialTab : 'overview';
  const [activeTab, setActiveTab] = useState<FeatureTabKey>(effectiveInitial);

  const { tabs, fetchTab, refreshTab } = useTabDataFetch<LazyTabKey>(featureId, TAB_FETCHERS);

  // Reset tab when featureId changes
  const prevFeatureIdRef = useRef(featureId);
  useEffect(() => {
    if (prevFeatureIdRef.current !== featureId) {
      prevFeatureIdRef.current = featureId;
      setActiveTab('overview');
    }
  }, [featureId]);

  // When initialTab changes (e.g. SSE updates lifecycle), switch to it if visible
  const prevInitialTabRef = useRef(initialTab);
  useEffect(() => {
    if (
      prevInitialTabRef.current !== initialTab &&
      initialTab &&
      visibleTabs.includes(initialTab)
    ) {
      prevInitialTabRef.current = initialTab;
      setActiveTab(initialTab);
    }
  }, [initialTab, visibleTabs]);

  // If the active tab becomes invisible (lifecycle changed), fall back to overview
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [visibleTabs, activeTab]);

  // SSE refresh: re-fetch active lazy tab when featureNode reference changes
  const featureNodeRef = useRef(featureNode);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (featureNodeRef.current !== featureNode) {
      featureNodeRef.current = featureNode;
      const current = activeTabRef.current;
      if (current === 'activity' || current === 'plan') {
        refreshTab(current);
      }
    }
  }, [featureNode, refreshTab]);

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as FeatureTabKey;
      setActiveTab(tab);
      if (tab === 'activity' || tab === 'plan') {
        fetchTab(tab);
      }
    },
    [fetchTab]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 overflow-x-auto px-4 pt-4">
          <TabsList className="flex w-full">
            {visibleTabDefs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="flex-1">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 flex-1 overflow-y-auto">
          <OverviewTab data={featureNode} />
        </TabsContent>

        <TabsContent value="activity" className="mt-0 flex-1 overflow-y-auto">
          <ActivityTab
            timings={(tabs.activity.data as ActivityData | null)?.timings ?? null}
            loading={tabs.activity.loading}
            error={tabs.activity.error}
            rejectionFeedback={(tabs.activity.data as ActivityData | null)?.rejectionFeedback}
          />
        </TabsContent>

        <TabsContent value="log" className="mt-0 flex-1 overflow-hidden">
          <LogTab
            content={featureLogs.content}
            isConnected={featureLogs.isConnected}
            error={featureLogs.error}
          />
        </TabsContent>

        <TabsContent value="plan" className="mt-0 flex-1 overflow-y-auto">
          <PlanTab
            plan={tabs.plan.data as PlanData | null}
            loading={tabs.plan.loading}
            error={tabs.plan.error}
          />
        </TabsContent>

        {/* PRD Review tab */}
        {visibleTabs.includes('prd-review') ? (
          <TabsContent value="prd-review" className="mt-0 flex min-h-0 flex-1 flex-col">
            {prdData ? (
              <PrdQuestionnaire
                data={prdData}
                selections={prdSelections ?? {}}
                onSelect={onPrdSelect ?? (() => undefined)}
                onApprove={onPrdApprove ?? (() => undefined)}
                onReject={onPrdReject}
                isProcessing={isPrdLoading}
                isRejecting={isRejecting}
                chatInput={chatInput}
                onChatInputChange={onChatInputChange}
              />
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            )}
          </TabsContent>
        ) : null}

        {/* Tech Decisions tab */}
        {visibleTabs.includes('tech-decisions') ? (
          <TabsContent value="tech-decisions" className="mt-0 flex min-h-0 flex-1 flex-col">
            {techData ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto">
                  <TechDecisionsContent data={techData} />
                </div>
                <DrawerActionBarForTech
                  onApprove={onTechApprove ?? (() => undefined)}
                  onReject={onTechReject}
                  isProcessing={isTechLoading}
                  isRejecting={isRejecting}
                  chatInput={chatInput}
                  onChatInputChange={onChatInputChange}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            )}
          </TabsContent>
        ) : null}

        {/* Product Decisions tab */}
        {visibleTabs.includes('product-decisions') ? (
          <TabsContent value="product-decisions" className="mt-0 flex-1 overflow-y-auto">
            {productData === null ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : productData ? (
              <ProductDecisionsSummary data={productData} />
            ) : (
              <p className="text-muted-foreground p-4 text-center text-sm">
                No product decisions available.
              </p>
            )}
          </TabsContent>
        ) : null}

        {/* Merge Review tab */}
        {visibleTabs.includes('merge-review') ? (
          <TabsContent value="merge-review" className="mt-0 flex min-h-0 flex-1 flex-col">
            {mergeData ? (
              <MergeReview
                data={mergeData}
                onApprove={onMergeApprove ?? (() => undefined)}
                onReject={onMergeReject}
                isProcessing={isMergeLoading}
                isRejecting={isRejecting}
                chatInput={chatInput}
                onChatInputChange={onChatInputChange}
              />
            ) : (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            )}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

// ── Private helper ──────────────────────────────────────────────────────

function DrawerActionBarForTech({
  onApprove,
  onReject,
  isProcessing,
  isRejecting,
  chatInput,
  onChatInputChange,
}: {
  onApprove: () => void;
  onReject?: (feedback: string, attachments: RejectAttachment[]) => void;
  isProcessing?: boolean;
  isRejecting?: boolean;
  chatInput?: string;
  onChatInputChange?: (value: string) => void;
}) {
  return (
    <DrawerActionBar
      onReject={onReject}
      onApprove={onApprove}
      approveLabel="Approve Plan"
      revisionPlaceholder="Ask AI to revise the plan..."
      isProcessing={isProcessing}
      isRejecting={isRejecting}
      chatInput={chatInput}
      onChatInputChange={onChatInputChange}
    />
  );
}
