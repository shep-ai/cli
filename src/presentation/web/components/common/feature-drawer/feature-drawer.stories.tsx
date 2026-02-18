import { useState, useEffect } from 'react';
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
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
};

const runningData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement OAuth2 authentication flow',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 45,
  agentType: 'claude-code',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
};

const actionRequiredData: FeatureNodeData = {
  name: 'API Rate Limiting',
  description: 'Implement sliding window rate limiting for public endpoints',
  featureId: '#bi1',
  lifecycle: 'requirements',
  state: 'action-required',
  progress: 22,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/api-rate-limiting',
};

const doneData: FeatureNodeData = {
  name: 'Payment Gateway',
  description: 'Stripe integration for subscriptions',
  featureId: '#f3',
  lifecycle: 'deploy',
  state: 'done',
  progress: 100,
  runtime: '1h 42m',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/payment-gateway',
};

const blockedData: FeatureNodeData = {
  name: 'Search Index',
  description: 'Elasticsearch full-text search setup',
  featureId: '#f4',
  lifecycle: 'implementation',
  state: 'blocked',
  progress: 20,
  blockedBy: 'Auth Module',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/search-index',
};

const errorData: FeatureNodeData = {
  name: 'Email Service',
  description: 'Transactional email with SendGrid',
  featureId: '#f5',
  lifecycle: 'review',
  state: 'error',
  progress: 30,
  errorMessage: 'Build failed: type mismatch',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/email-service',
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
        agentType: 'cursor',
        runtime: '3h 15m',
        blockedBy: 'Database Migration',
        errorMessage: 'Token refresh failed: invalid_grant',
        repositoryPath: '/home/user/enterprise-app',
        branch: 'feat/enterprise-auth',
      }}
      label="Open All Fields"
    />
  ),
};

/* ---------------------------------------------------------------------------
 * Matrix stories — interactive state/lifecycle switcher
 * ------------------------------------------------------------------------- */

const creatingData: FeatureNodeData = {
  name: 'User Onboarding',
  description: 'Implement guided onboarding wizard',
  featureId: '',
  lifecycle: 'requirements',
  state: 'creating',
  progress: 0,
  repositoryPath: '/home/user/my-repo',
  branch: '',
};

const stateFixtures: Record<FeatureNodeState, FeatureNodeData> = {
  creating: creatingData,
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
                agentType: 'claude-code',
                repositoryPath: '/home/user/my-repo',
                branch: 'feat/feature-name',
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

/* ---------------------------------------------------------------------------
 * Action button stories
 * ------------------------------------------------------------------------- */

/** No repositoryPath — action buttons are hidden. */
export const NoRepositoryPath: Story = {
  render: () => (
    <DrawerTrigger
      data={{ ...baseData, repositoryPath: '', branch: '' }}
      label="Open Without Repo Path"
    />
  ),
};

/**
 * Action buttons visible — click "Open in IDE" or "Open in Shell" to see
 * loading spinner (while API call is in flight) followed by error state
 * (API routes are not available in Storybook).
 */
export const WithActionButtons: Story = {
  render: () => <DrawerTrigger data={runningData} label="Open With Actions" />,
};

/* ---------------------------------------------------------------------------
 * Delete stories
 * ------------------------------------------------------------------------- */

function noop() {
  // intentional no-op for stories
}

function DrawerTriggerWithDelete({
  data,
  label,
  isDeleting = false,
}: {
  data: FeatureNodeData;
  label: string;
  isDeleting?: boolean;
}) {
  const [selected, setSelected] = useState<FeatureNodeData | null>(null);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setSelected(data)}>
        {label}
      </Button>
      <FeatureDrawer
        selectedNode={selected}
        onClose={() => setSelected(null)}
        onDelete={noop}
        isDeleting={isDeleting}
      />
    </div>
  );
}

/** FeatureDrawer with a delete button in the footer. */
export const WithDeleteButton: Story = {
  render: () => <DrawerTriggerWithDelete data={doneData} label="Open With Delete" />,
};

/** FeatureDrawer showing the delete button in loading/disabled state. */
export const DeletingState: Story = {
  render: () => <DrawerTriggerWithDelete data={doneData} label="Open Deleting State" isDeleting />,
};

/** FeatureDrawer with a running agent showing the running-agent warning in the AlertDialog. */
export const DeleteRunningAgent: Story = {
  render: () => <DrawerTriggerWithDelete data={runningData} label="Open Running Agent Delete" />,
};

/* ---------------------------------------------------------------------------
 * PRD Spec stories — fetch mock + action-required/requirements fixtures
 * ------------------------------------------------------------------------- */

const prdSpecFixture = {
  name: 'api-rate-limiting',
  summary:
    'Implement sliding window rate limiting for all public API endpoints to prevent abuse and ensure fair usage across tenants.',
  content:
    '## Problem Statement\n\nPublic API endpoints are currently unprotected against abuse.\nHigh-volume consumers can overwhelm the service, degrading performance for all users.\n\n## Success Criteria\n\n- [ ] SC-1: Rate limit headers present on all public responses\n- [ ] SC-2: 429 status returned when limit exceeded\n- [ ] SC-3: Sliding window algorithm with per-tenant configuration\n\n## Functional Requirements\n\n- FR-1: Implement sliding window counter using Redis sorted sets\n- FR-2: Configure per-endpoint and per-tenant limits via YAML\n- FR-3: Return Retry-After header with 429 responses',
  openQuestions: [
    {
      question: 'Should rate limits be configurable per-tenant or global only?',
      resolved: true,
      answer: 'Per-tenant with a global fallback default. Store in tenant settings.',
    },
    {
      question: 'Which Redis data structure for the sliding window?',
      resolved: true,
      answer: 'Sorted sets with ZRANGEBYSCORE for window queries.',
    },
    {
      question: 'Should we add rate limit headers to internal endpoints too?',
      resolved: false,
    },
  ],
  technologies: ['Redis', 'Express middleware', 'TypeScript'],
  relatedFeatures: [],
  relatedLinks: [],
  phase: 'Requirements',
  sizeEstimate: 'M',
};

const longContentFixture = {
  ...prdSpecFixture,
  content: Array.from(
    { length: 80 },
    (_, i) =>
      `Line ${i + 1}: This is a long PRD content line for testing scroll behavior in the drawer component.`
  ).join('\n'),
};

const mixedQuestionsFixture = {
  ...prdSpecFixture,
  openQuestions: [
    {
      question: 'Should rate limits be configurable per-tenant or global only?',
      resolved: true,
      answer: 'Per-tenant with a global fallback default.',
    },
    { question: 'Which Redis data structure for the sliding window?', resolved: false },
    {
      question: 'How should we handle rate limit bypass for internal services?',
      resolved: true,
      answer:
        'Use a shared secret header that bypasses rate limiting for service-to-service calls.',
    },
    { question: 'Should we expose rate limit metrics via Prometheus?', resolved: false },
  ],
};

/**
 * Wrapper that mocks fetch for /api/features/.../spec to return fixture data.
 * Restores original fetch on unmount.
 */
function DrawerTriggerWithSpecMock({
  data,
  label,
  specResponse,
  specStatus = 200,
}: {
  data: FeatureNodeData;
  label: string;
  specResponse?: object;
  specStatus?: number;
}) {
  const [selected, setSelected] = useState<FeatureNodeData | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/features/') && url.endsWith('/spec')) {
        // Simulate a small network delay
        await new Promise((r) => setTimeout(r, 300));
        return new Response(JSON.stringify(specResponse ?? { error: 'Not found' }), {
          status: specStatus,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [specResponse, specStatus]);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setSelected(data)}>
        {label}
      </Button>
      <FeatureDrawer selectedNode={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/** Action-required + requirements with a full PRD spec (summary, questions, content). */
export const ActionRequiredWithPrd: Story = {
  render: () => (
    <DrawerTriggerWithSpecMock
      data={actionRequiredData}
      label="Open With PRD"
      specResponse={prdSpecFixture}
    />
  ),
};

/** Action-required + requirements but spec API returns 404 — no PRD section shown. */
export const ActionRequiredNoPrd: Story = {
  render: () => (
    <DrawerTriggerWithSpecMock
      data={actionRequiredData}
      label="Open Without PRD"
      specStatus={404}
    />
  ),
};

/** Long PRD content that demonstrates ScrollArea scrolling at max-height 400px. */
export const ActionRequiredLongContent: Story = {
  render: () => (
    <DrawerTriggerWithSpecMock
      data={actionRequiredData}
      label="Open Long Content PRD"
      specResponse={longContentFixture}
    />
  ),
};

/** Mixed resolved/unresolved open questions with Badge variants. */
export const ActionRequiredMixedQuestions: Story = {
  render: () => (
    <DrawerTriggerWithSpecMock
      data={actionRequiredData}
      label="Open Mixed Questions PRD"
      specResponse={mixedQuestionsFixture}
    />
  ),
};
