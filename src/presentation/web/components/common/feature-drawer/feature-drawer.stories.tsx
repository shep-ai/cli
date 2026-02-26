import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
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
  errorMessage: `Build failed: type mismatch in src/email/templates.ts

TypeError: Cannot read property 'send' of undefined
    at EmailService.sendTransactional (src/email/service.ts:45:12)
    at async UserController.register (src/controllers/user.ts:89:5)
    at async middleware (src/middleware/auth.ts:23:7)

This error occurs because the SendGrid client is not properly initialized.
Check your email service configuration environment variable.`,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/email-service',
};

const errorDataShort: FeatureNodeData = {
  name: 'Auth Module',
  description: 'OAuth2 authentication flow',
  featureId: '#f6',
  lifecycle: 'implementation',
  state: 'error',
  progress: 45,
  errorMessage: 'Build failed: type mismatch in src/auth.ts',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
};

const errorDataMedium: FeatureNodeData = {
  name: 'Payment Gateway',
  description: 'Stripe integration for subscriptions',
  featureId: '#f7',
  lifecycle: 'implementation',
  state: 'error',
  progress: 60,
  errorMessage: `Payment processing failed: invalid card token

Error details:
  - Card token: XXXX-XXXX-XXXX-1234
  - Amount: $99.99 USD
  - Customer ID: cus_abc123
  - Error code: card_declined
  - Message: Your card was declined

Please check the card details and try again.`,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/payment-gateway',
};

const errorDataLongStackTrace: FeatureNodeData = {
  name: 'Database Migration',
  description: 'PostgreSQL schema migration for v2.0',
  featureId: '#f8',
  lifecycle: 'implementation',
  state: 'error',
  progress: 75,
  errorMessage: `Migration failed: foreign key constraint violation

Error: insert or update on table "orders" violates foreign key constraint "orders_user_id_fkey"
    at Parser.parseErrorMessage (/app/node_modules/pg-protocol/dist/parser.js:287:98)
    at Parser.handlePacket (/app/node_modules/pg-protocol/dist/parser.js:126:29)
    at Parser.parse (/app/node_modules/pg-protocol/dist/parser.js:39:38)
    at Socket.<anonymous> (/app/node_modules/pg-protocol/dist/index.js:11:42)
    at Socket.emit (node:events:513:28)
    at addChunk (node:internal/streams/readable:324:12)
    at readableAddChunk (node:internal/streams/readable:297:9)
    at Readable.push (node:internal/streams/readable:234:10)
    at TCP.onStreamRead (node:internal/stream_base_commons:190:23)
    at Connection.parseE (/app/node_modules/pg/lib/connection.js:633:11)
    at Connection.parseMessage (/app/node_modules/pg/lib/connection.js:410:19)
    at Socket.<anonymous> (/app/node_modules/pg/lib/connection.js:129:22)
    at Socket.emit (node:events:513:28)
    at addChunk (node:internal/streams/readable:324:12)
    at readableAddChunk (node:internal/streams/readable:297:9)
    at Readable.push (node:internal/streams/readable:234:10)
    at TCP.onStreamRead (node:internal/stream_base_commons:190:23)

Detail: Key (user_id)=(999) is not present in table "users".
Hint: Check that the user_id exists in the users table before inserting into orders.

Migration SQL:
  INSERT INTO orders (id, user_id, total, status, created_at)
  VALUES (1001, 999, 149.99, 'pending', NOW());

Context:
  - Migration version: 20260226_001
  - Database: production_db
  - Schema: public
  - User: migration_user
  - Connection: postgres://localhost:5432/production_db

Failed queries (last 5):
  1. CREATE INDEX idx_orders_user_id ON orders(user_id);
  2. CREATE INDEX idx_orders_status ON orders(status);
  3. ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
  4. INSERT INTO orders (id, user_id, total, status, created_at) VALUES (1001, 999, 149.99, 'pending', NOW());
  5. ROLLBACK;

The migration has been rolled back. Please fix the data inconsistencies before retrying.`,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/database-migration',
};

const noErrorData: FeatureNodeData = {
  name: 'UI Components Library',
  description: 'Reusable React components with TypeScript',
  featureId: '#f9',
  lifecycle: 'implementation',
  state: 'running',
  progress: 55,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/ui-components',
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

/** Error tab with a short (1-line) error message. */
export const ErrorShortMessage: Story = {
  render: () => <DrawerTrigger data={errorDataShort} label="Open Error (Short)" />,
};

/** Error tab with a medium-length (~10 lines) error message with formatting. */
export const ErrorMediumMessage: Story = {
  render: () => <DrawerTrigger data={errorDataMedium} label="Open Error (Medium)" />,
};

/** Error tab with a very long (~50+ lines) stack trace demonstrating scrolling. */
export const ErrorLongStackTrace: Story = {
  render: () => <DrawerTrigger data={errorDataLongStackTrace} label="Open Error (Long)" />,
};

/** No error state — errorMessage is undefined, tabs should not appear. */
export const NoErrorState: Story = {
  render: () => <DrawerTrigger data={noErrorData} label="Open No Error" />,
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
 * PR info stories
 * ------------------------------------------------------------------------- */

const doneWithPrData: FeatureNodeData = {
  ...doneData,
  pr: {
    url: 'https://github.com/org/repo/pull/42',
    number: 42,
    status: PrStatus.Merged,
    ciStatus: CiStatus.Success,
    commitHash: 'abc1234567890def',
  },
};

const doneWithPartialPrData: FeatureNodeData = {
  ...doneData,
  pr: {
    url: 'https://github.com/org/repo/pull/99',
    number: 99,
    status: PrStatus.Merged,
  },
};

/** Done feature with full PR card — number, status, CI, commit hash. */
export const DoneWithPr: Story = {
  render: () => <DrawerTrigger data={doneWithPrData} label="Open Done + PR" />,
};

/** Done feature with partial PR data — no CI status, no commit hash. */
export const DoneWithPartialPr: Story = {
  render: () => <DrawerTrigger data={doneWithPartialPrData} label="Open Done + Partial PR" />,
};

/** PR with Open status — blue badge. */
export const PrStatusOpen: Story = {
  render: () => (
    <DrawerTrigger
      data={{
        ...doneWithPrData,
        pr: { ...doneWithPrData.pr!, status: PrStatus.Open, ciStatus: CiStatus.Pending },
      }}
      label="Open PR Status: Open"
    />
  ),
};

/** PR with Merged status — purple badge. */
export const PrStatusMerged: Story = {
  render: () => <DrawerTrigger data={doneWithPrData} label="Open PR Status: Merged" />,
};
