'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getFeaturePhaseTimings } from '@/app/actions/get-feature-phase-timings';
import type { PhaseTimingData } from '@/app/actions/get-feature-phase-timings';
import { getFeatureMessages } from '@/app/actions/get-feature-messages';
import type { MessageData } from '@/app/actions/get-feature-messages';
import { getFeaturePlan } from '@/app/actions/get-feature-plan';
import type { PlanData } from '@/app/actions/get-feature-plan';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { OverviewTab } from './overview-tab';
import { ActivityTab } from './activity-tab';
import { MessagesTab } from './messages-tab';
import { PlanTab } from './plan-tab';
import { useTabDataFetch } from './use-tab-data-fetch';
import type { TabFetchers } from './use-tab-data-fetch';

type TabKey = 'activity' | 'messages' | 'plan';
type ActiveTab = 'overview' | TabKey;

export interface FeatureDrawerTabsProps {
  featureNode: FeatureNodeData;
  featureId: string;
}

async function fetchActivity(featureId: string): Promise<PhaseTimingData[]> {
  const result = await getFeaturePhaseTimings(featureId);
  if ('error' in result) throw new Error(result.error);
  return result.timings;
}

async function fetchMessages(featureId: string): Promise<MessageData[]> {
  const result = await getFeatureMessages(featureId);
  if ('error' in result) throw new Error(result.error);
  return result.messages;
}

async function fetchPlan(featureId: string): Promise<PlanData | undefined> {
  const result = await getFeaturePlan(featureId);
  if ('error' in result) throw new Error(result.error);
  return result.plan;
}

const TAB_FETCHERS: TabFetchers<TabKey> = {
  activity: fetchActivity,
  messages: fetchMessages,
  plan: fetchPlan,
};

export function FeatureDrawerTabs({ featureNode, featureId }: FeatureDrawerTabsProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const { tabs, fetchTab, refreshTab } = useTabDataFetch<TabKey>(featureId, TAB_FETCHERS);

  // Reset to overview when featureId changes
  const prevFeatureIdRef = useRef(featureId);
  useEffect(() => {
    if (prevFeatureIdRef.current !== featureId) {
      prevFeatureIdRef.current = featureId;
      setActiveTab('overview');
    }
  }, [featureId]);

  // SSE refresh: re-fetch active tab data when featureNode reference changes
  const featureNodeRef = useRef(featureNode);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (featureNodeRef.current !== featureNode) {
      featureNodeRef.current = featureNode;
      const current = activeTabRef.current;
      if (current !== 'overview') {
        refreshTab(current);
      }
    }
  }, [featureNode, refreshTab]);

  const handleTabChange = useCallback(
    (value: string) => {
      const tab = value as ActiveTab;
      setActiveTab(tab);
      if (tab !== 'overview') {
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
        <div className="shrink-0 px-4 pt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="plan">Plan</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 flex-1 overflow-y-auto">
          <OverviewTab data={featureNode} />
        </TabsContent>

        <TabsContent value="activity" className="mt-0 flex-1 overflow-y-auto">
          <ActivityTab
            timings={tabs.activity.data as PhaseTimingData[] | null}
            loading={tabs.activity.loading}
            error={tabs.activity.error}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-0 flex-1 overflow-y-auto">
          <MessagesTab
            messages={tabs.messages.data as MessageData[] | null}
            loading={tabs.messages.loading}
            error={tabs.messages.error}
          />
        </TabsContent>

        <TabsContent value="plan" className="mt-0 flex-1 overflow-y-auto">
          <PlanTab
            plan={tabs.plan.data as PlanData | null}
            loading={tabs.plan.loading}
            error={tabs.plan.error}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
