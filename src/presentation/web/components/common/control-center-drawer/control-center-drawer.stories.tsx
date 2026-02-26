import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { Button } from '@/components/ui/button';
import { ControlCenterDrawer } from './control-center-drawer';
import type { DrawerView } from './drawer-view';

const meta: Meta<typeof ControlCenterDrawer> = {
  title: 'Drawers/ControlCenterDrawer',
  component: ControlCenterDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ControlCenterDrawer>;

/* ---------------------------------------------------------------------------
 * Fixtures
 * ------------------------------------------------------------------------- */

const featureView: DrawerView = {
  type: 'feature',
  node: {
    name: 'Auth Module',
    description: 'Implement OAuth2 authentication flow',
    featureId: '#f1',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    agentType: 'claude-code',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/auth-module',
    specPath: '/home/user/my-repo/specs/001-auth-module',
  },
};

const featureDoneView: DrawerView = {
  type: 'feature',
  node: {
    name: 'Payment Gateway',
    description: 'Stripe integration for subscriptions',
    featureId: '#f3',
    lifecycle: 'maintain',
    state: 'done',
    progress: 100,
    runtime: '1h 42m',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/payment-gateway',
    pr: {
      url: 'https://github.com/org/repo/pull/42',
      number: 42,
      status: PrStatus.Merged,
      ciStatus: CiStatus.Success,
      commitHash: 'abc1234567890',
    },
  },
};

const featureErrorView: DrawerView = {
  type: 'feature',
  node: {
    name: 'Email Service',
    description: 'Transactional email with SendGrid',
    featureId: '#f5',
    lifecycle: 'review',
    state: 'error',
    progress: 30,
    errorMessage: 'Build failed: type mismatch in auth middleware',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/email-service',
  },
};

const prdReviewView: DrawerView = {
  type: 'prd-review',
  node: {
    name: 'API Rate Limiting',
    description: 'Sliding window rate limiting for public endpoints',
    featureId: 'feat-abc123',
    lifecycle: 'requirements',
    state: 'action-required',
    progress: 0,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/api-rate-limiting',
    specPath: '/home/user/my-repo/specs/002-rate-limiting',
  },
};

const techReviewView: DrawerView = {
  type: 'tech-review',
  node: {
    name: 'Search Index',
    description: 'Elasticsearch full-text search integration',
    featureId: 'feat-def456',
    lifecycle: 'implementation',
    state: 'action-required',
    progress: 0,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/search-index',
    specPath: '/home/user/my-repo/specs/003-search',
  },
};

const mergeReviewView: DrawerView = {
  type: 'merge-review',
  node: {
    name: 'Auth Module',
    description: 'OAuth2 authentication flow',
    featureId: 'feat-ghi789',
    lifecycle: 'review',
    state: 'action-required',
    progress: 100,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/auth-module',
    specPath: '/home/user/my-repo/specs/001-auth-module',
    pr: {
      url: 'https://github.com/org/repo/pull/17',
      number: 17,
      status: PrStatus.Open,
      ciStatus: CiStatus.Success,
    },
  },
};

const createView: DrawerView = {
  type: 'feature-create',
  repositoryPath: '/home/user/my-repo',
  features: [
    { id: 'feat-abc123', name: 'API Rate Limiting' },
    { id: 'feat-def456', name: 'Search Index' },
  ],
  workflowDefaults: {
    approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
    push: true,
    openPr: false,
  },
};

const repositoryView: DrawerView = {
  type: 'repository',
  data: {
    id: 'repo-1',
    name: 'my-awesome-app',
    repositoryPath: '/home/user/my-awesome-app',
  },
};

/* ---------------------------------------------------------------------------
 * Trigger wrapper
 * ------------------------------------------------------------------------- */

function Trigger({ view, label }: { view: DrawerView; label: string }) {
  const [activeView, setActiveView] = useState<DrawerView | null>(null);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setActiveView(view)}>
        {label}
      </Button>
      <ControlCenterDrawer
        view={activeView}
        onClose={() => setActiveView(null)}
        onDelete={(_id) => undefined}
        onCreateSubmit={() => setActiveView(null)}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stories — one per view type
 * ------------------------------------------------------------------------- */

/** Feature info view — running state with progress. Default story. */
export const Default: Story = {
  render: () => <Trigger view={featureView} label="Open Feature (Running)" />,
};

/** Feature info view — completed (maintain lifecycle, done state, merged PR). */
export const FeatureDone: Story = {
  render: () => <Trigger view={featureDoneView} label="Open Feature (Done + PR)" />,
};

/** Feature info view — error state. */
export const FeatureError: Story = {
  render: () => <Trigger view={featureErrorView} label="Open Feature (Error)" />,
};

/**
 * PRD review view — loads questionnaire data via server action.
 * Shows spinner in Storybook (no real API available).
 */
export const PrdReview: Story = {
  render: () => <Trigger view={prdReviewView} label="Open PRD Review" />,
};

/**
 * Tech decisions review view — loads research artifact via server action.
 * Shows spinner in Storybook.
 */
export const TechReview: Story = {
  render: () => <Trigger view={techReviewView} label="Open Tech Review" />,
};

/**
 * Merge review view — loads merge review data via server action.
 * Shows spinner in Storybook.
 */
export const MergeReview: Story = {
  render: () => <Trigger view={mergeReviewView} label="Open Merge Review" />,
};

/** Feature create form. */
export const FeatureCreate: Story = {
  render: () => <Trigger view={createView} label="Open Create Feature" />,
};

/** Repository actions view. */
export const Repository: Story = {
  render: () => <Trigger view={repositoryView} label="Open Repository" />,
};

/* ---------------------------------------------------------------------------
 * Interactive switcher — cycle through all views
 * ------------------------------------------------------------------------- */

const allViews: { label: string; view: DrawerView }[] = [
  { label: 'Feature (Running)', view: featureView },
  { label: 'Feature (Done)', view: featureDoneView },
  { label: 'Feature (Error)', view: featureErrorView },
  { label: 'PRD Review', view: prdReviewView },
  { label: 'Tech Review', view: techReviewView },
  { label: 'Merge Review', view: mergeReviewView },
  { label: 'Create Feature', view: createView },
  { label: 'Repository', view: repositoryView },
];

function AllViewsSwitcher() {
  const [activeView, setActiveView] = useState<DrawerView | null>(null);

  return (
    <div className="flex h-screen">
      <div className="flex flex-col gap-2 p-4">
        <span className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
          Select view
        </span>
        {allViews.map(({ label, view }) => (
          <button
            key={label}
            type="button"
            onClick={() => setActiveView(view)}
            className={`rounded-md px-3 py-1.5 text-left text-sm ${
              activeView?.type === view.type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setActiveView(null)}
          className="bg-destructive/10 text-destructive hover:bg-destructive/20 mt-2 rounded-md px-3 py-1.5 text-left text-sm"
        >
          Close drawer
        </button>
      </div>
      <ControlCenterDrawer
        view={activeView}
        onClose={() => setActiveView(null)}
        onDelete={(_id) => undefined}
        onCreateSubmit={() => setActiveView(null)}
      />
    </div>
  );
}

/** Interactive — click any view type to open that drawer panel. */
export const AllViews: Story = {
  render: () => <AllViewsSwitcher />,
};
