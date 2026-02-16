import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FeatureDrawer } from './feature-drawer';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { FeatureLifecyclePhase, FeatureNodeState } from '@/components/common/feature-node';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof FeatureDrawer> = {
  title: 'Composed/FeatureDrawer',
  component: FeatureDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof FeatureDrawer>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const baseData: FeatureNodeData = {
  name: 'Auth Module',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 45,
};

const runningData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement OAuth2 authentication flow',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 45,
  agentName: 'Planner',
};

const actionRequiredData: FeatureNodeData = {
  name: 'API Rate Limiting',
  description: 'Implement sliding window rate limiting for public endpoints',
  featureId: '#bi1',
  lifecycle: 'requirements',
  state: 'action-required',
  progress: 22,
};

const doneData: FeatureNodeData = {
  name: 'Payment Gateway',
  description: 'Stripe integration for subscriptions',
  featureId: '#f3',
  lifecycle: 'deploy',
  state: 'done',
  progress: 100,
  runtime: '1h 42m',
};

const blockedData: FeatureNodeData = {
  name: 'Search Index',
  description: 'Elasticsearch full-text search setup',
  featureId: '#f4',
  lifecycle: 'implementation',
  state: 'blocked',
  progress: 20,
  blockedBy: 'Auth Module',
};

const errorData: FeatureNodeData = {
  name: 'Email Service',
  description: 'Transactional email with SendGrid',
  featureId: '#f5',
  lifecycle: 'review',
  state: 'error',
  progress: 30,
  errorMessage: 'Build failed: type mismatch',
};

/* ---------------------------------------------------------------------------
 * Trigger wrapper — starts closed, click to open
 * ------------------------------------------------------------------------- */

function DrawerTrigger({ data, label }: { data: FeatureNodeData; label: string }) {
  const [selected, setSelected] = useState<FeatureNodeData | null>(null);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setSelected(data)}>
        {label}
      </Button>
      <FeatureDrawer selectedNode={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Per-state stories
 * ------------------------------------------------------------------------- */

export const Running: Story = {
  render: () => <DrawerTrigger data={runningData} label="Open Running" />,
};

export const ActionRequired: Story = {
  render: () => <DrawerTrigger data={actionRequiredData} label="Open Action Required" />,
};

export const Done: Story = {
  render: () => <DrawerTrigger data={doneData} label="Open Done" />,
};

export const Blocked: Story = {
  render: () => <DrawerTrigger data={blockedData} label="Open Blocked" />,
};

export const Error: Story = {
  render: () => <DrawerTrigger data={errorData} label="Open Error" />,
};

/* ---------------------------------------------------------------------------
 * Edge-case stories
 * ------------------------------------------------------------------------- */

/** Minimal data — only required fields, no optional details section. */
export const MinimalData: Story = {
  render: () => <DrawerTrigger data={{ ...baseData, progress: 0 }} label="Open Minimal" />,
};

/** All optional fields populated — description, agent, runtime, blockedBy, error. */
export const AllFields: Story = {
  render: () => (
    <DrawerTrigger
      data={{
        name: 'Enterprise Authentication Module',
        description:
          'Implement a comprehensive OAuth2 authentication flow with support for multiple identity providers including Google, GitHub, and custom SAML-based enterprise SSO.',
        featureId: '#f99',
        lifecycle: 'implementation',
        state: 'running',
        progress: 68,
        agentName: 'Implementer',
        runtime: '3h 15m',
        blockedBy: 'Database Migration',
        errorMessage: 'Token refresh failed: invalid_grant',
      }}
      label="Open All Fields"
    />
  ),
};

/* ---------------------------------------------------------------------------
 * Matrix stories — interactive state/lifecycle switcher
 * ------------------------------------------------------------------------- */

const stateFixtures: Record<FeatureNodeState, FeatureNodeData> = {
  running: runningData,
  'action-required': actionRequiredData,
  done: doneData,
  blocked: blockedData,
  error: errorData,
};

const allLifecycles: FeatureLifecyclePhase[] = [
  'requirements',
  'research',
  'implementation',
  'review',
  'deploy',
  'maintain',
];

function AllStatesRender() {
  const [state, setState] = useState<FeatureNodeState>('running');
  const [selected, setSelected] = useState<FeatureNodeData | null>(null);
  const _data = stateFixtures[state];

  return (
    <div className="flex h-screen">
      <div className="flex flex-col gap-2 p-4">
        <span className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
          Select state
        </span>
        {(Object.keys(stateFixtures) as FeatureNodeState[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setState(s);
              setSelected(stateFixtures[s]);
            }}
            className={`rounded-md px-3 py-1.5 text-left text-sm ${
              s === state ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <FeatureDrawer selectedNode={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Cycle through all 5 states at a glance via buttons. */
export const AllStates: Story = {
  render: () => <AllStatesRender />,
};

function AllLifecyclesRender() {
  const [lifecycle, setLifecycle] = useState<FeatureLifecyclePhase>('requirements');
  const [selected, setSelected] = useState<FeatureNodeData | null>(null);

  return (
    <div className="flex h-screen">
      <div className="flex flex-col gap-2 p-4">
        <span className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
          Select phase
        </span>
        {allLifecycles.map((phase) => (
          <button
            key={phase}
            type="button"
            onClick={() => {
              setLifecycle(phase);
              setSelected({
                name: 'Feature Name',
                description: `Currently in ${phase} phase`,
                featureId: '#f1',
                lifecycle: phase,
                state: 'running',
                progress: 50,
                agentName: 'Agent',
              });
            }}
            className={`rounded-md px-3 py-1.5 text-left text-sm ${
              phase === lifecycle
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {phase}
          </button>
        ))}
      </div>
      <FeatureDrawer selectedNode={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Cycle through all 6 lifecycle phases via buttons. */
export const AllLifecycles: Story = {
  render: () => <AllLifecyclesRender />,
};
