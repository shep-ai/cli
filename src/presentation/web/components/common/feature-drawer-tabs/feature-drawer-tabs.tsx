'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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
  /** Tab key from URL path segment (e.g. /feature/[id]/activity → 'activity'). */
  urlTab?: FeatureTabKey;

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
  urlTab,
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
  const pathname = usePathname();
  const featureLogs = useFeatureLogs(featureId);

  const visibleTabs = useMemo(() => computeVisibleTabs(featureNode), [featureNode]);
  const visibleTabDefs = useMemo(
    () => ALL_TABS.filter((t) => visibleTabs.includes(t.key)),
    [visibleTabs]
  );

  // Derive the base path (without tab segment) from the current pathname.
  // e.g. /feature/abc123/activity → /feature/abc123
  const basePath = useMemo(() => {
    const match = pathname.match(/^(\/feature\/[^/]+)/);
    return match ? match[1] : pathname;
  }, [pathname]);

  // Resolve the effective initial tab: URL path tab > initialTab prop > 'overview'
  const effectiveInitial = useMemo(() => {
    if (urlTab && visibleTabs.includes(urlTab)) return urlTab;
    if (initialTab && visibleTabs.includes(initialTab)) return initialTab;
    return 'overview';
    // Only compute on mount — subsequent changes are handled by effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [activeTab, setActiveTab] = useState<FeatureTabKey>(effectiveInitial);

  const { tabs, fetchTab, refreshTab } = useTabDataFetch<LazyTabKey>(featureId, TAB_FETCHERS);

  // Sync URL when active tab changes via user interaction.
  // Use window.history.pushState instead of router.push to avoid triggering a
  // server component re-render (which would remount the drawer).
  const isUserInteraction = useRef(false);
  useEffect(() => {
    if (!isUserInteraction.current) return;
    isUserInteraction.current = false;

    // Build the target URL from the base path + tab segment
    const targetUrl = activeTab === 'overview' ? basePath : `${basePath}/${activeTab}`;
    // Only update URL if it actually changed
    if (targetUrl !== pathname) {
      window.history.pushState(null, '', targetUrl);
    }
  }, [activeTab, basePath, pathname]);

  // Sync active tab from URL when pathname changes (e.g. browser back/forward).
  // Skip on initial mount — the effectiveInitial handles that via urlTab prop.
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current === pathname) return; // Skip initial mount
    prevPathnameRef.current = pathname;
    if (isUserInteraction.current) return; // Skip — this is our own navigation
    const segments = pathname.split('/');
    // pathname is /feature/[id] or /feature/[id]/[tab]
    const pathTab = segments.length >= 4 ? (segments[3] as FeatureTabKey) : undefined;
    const resolved = pathTab && visibleTabs.includes(pathTab) ? pathTab : 'overview';
    if (resolved !== activeTab) {
      setActiveTab(resolved);
      if (resolved === 'activity' || resolved === 'plan') {
        fetchTab(resolved);
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount, sync the URL to reflect the effective initial tab when it was
  // derived from feature state (initialTab) rather than from the URL (urlTab).
  // Use replaceState so we don't add a duplicate history entry.
  const initialSyncDone = useRef(false);
  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;
    // Only sync if the effective tab came from initialTab (not from URL)
    if (!urlTab && effectiveInitial !== 'overview') {
      const targetUrl = `${basePath}/${effectiveInitial}`;
      if (targetUrl !== pathname) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger lazy fetch for URL-driven initial tab
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    if (activeTab === 'activity' || activeTab === 'plan') {
      fetchTab(activeTab);
    }
  }, [activeTab, fetchTab]);

  // Reset tab when featureId changes
  const prevFeatureIdRef = useRef(featureId);
  useEffect(() => {
    if (prevFeatureIdRef.current !== featureId) {
      prevFeatureIdRef.current = featureId;
      setActiveTab('overview');
    }
  }, [featureId]);

  // When initialTab changes (e.g. SSE updates lifecycle), switch to it if visible
  // and sync the URL with replaceState so the address bar reflects the new tab.
  const prevInitialTabRef = useRef(initialTab);
  useEffect(() => {
    if (
      prevInitialTabRef.current !== initialTab &&
      initialTab &&
      visibleTabs.includes(initialTab)
    ) {
      prevInitialTabRef.current = initialTab;
      setActiveTab(initialTab);
      // Sync URL to match the new tab
      const targetUrl = initialTab === 'overview' ? basePath : `${basePath}/${initialTab}`;
      if (targetUrl !== window.location.pathname) {
        window.history.replaceState(null, '', targetUrl);
      }
    }
  }, [initialTab, visibleTabs, basePath]);

  // If the active tab becomes invisible (lifecycle changed), fall back to overview
  // and sync the URL accordingly.
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab('overview');
      if (window.location.pathname !== basePath) {
        window.history.replaceState(null, '', basePath);
      }
    }
  }, [visibleTabs, activeTab, basePath]);

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
      isUserInteraction.current = true;
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
