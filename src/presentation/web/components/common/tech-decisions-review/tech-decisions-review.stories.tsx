import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TechDecisionsReview } from './tech-decisions-review';
import { TechDecisionsDrawer } from './tech-decisions-drawer';
import type { TechDecisionsReviewData } from './tech-decisions-review-config';

const mockData: TechDecisionsReviewData = {
  name: 'Agent Executor Abstraction',
  summary:
    'Research into the best approach for abstracting agent executors to support multiple AI backends (Claude Code, Cursor, custom agents).',
  technologies: ['TypeScript', 'tsyringe', 'LangGraph', 'Claude API'],
  decisions: [
    {
      title: 'Agent Execution Framework',
      chosen: 'LangGraph',
      rejected: ['Custom state machine', 'Temporal.io', 'Step Functions'],
      rationale:
        'LangGraph provides built-in checkpointing, human-in-the-loop support, and integrates natively with LangChain. The custom state machine approach was too low-level and would require rebuilding features LangGraph offers out of the box.',
    },
    {
      title: 'Dependency Injection',
      chosen: 'tsyringe',
      rejected: ['InversifyJS', 'TypeDI', 'Manual DI'],
      rationale:
        'tsyringe is lightweight, uses standard decorators, and has minimal overhead. InversifyJS was too complex for our needs, and manual DI would not scale well as the agent system grows.',
    },
    {
      title: 'Inter-Process Communication',
      chosen: 'Server-Sent Events (SSE)',
      rejected: ['WebSockets', 'Long Polling', 'gRPC'],
      rationale:
        'SSE provides a simple one-way streaming protocol that fits our use case perfectly — the agent streams status updates to the UI. WebSockets would add unnecessary complexity for bidirectional communication we do not need.',
    },
    {
      title: 'Configuration Storage',
      chosen: 'SQLite',
      rejected: ['JSON files', 'LevelDB', 'PostgreSQL'],
      rationale:
        'SQLite offers ACID transactions, SQL query support, and zero-config deployment. JSON files lack transactions and concurrent access support. PostgreSQL would be overkill for a local CLI tool.',
    },
  ],
};

/* ─── Interactive wrapper for controlled state ─── */

function InteractiveReview(
  props: Omit<React.ComponentProps<typeof TechDecisionsReview>, 'selections' | 'onSelect'>
) {
  const [selections, setSelections] = useState<Record<number, string>>({});
  return (
    <TechDecisionsReview
      {...props}
      selections={selections}
      onSelect={(idx, val) => setSelections((prev) => ({ ...prev, [idx]: val }))}
    />
  );
}

/* ─── Standalone TechDecisionsReview ─── */

const meta: Meta<typeof TechDecisionsReview> = {
  title: 'Composed/TechDecisionsReview',
  component: TechDecisionsReview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '400px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TechDecisionsReview>;

/** Default state — stepper with decisions shown one at a time. */
export const Default: Story = {
  render: () => <InteractiveReview data={mockData} onApprove={fn().mockName('onApprove')} />,
};

/** Processing state — options disabled. */
export const Processing: Story = {
  render: () => (
    <InteractiveReview data={mockData} onApprove={fn().mockName('onApprove')} isProcessing />
  ),
};

/** Single decision — minimal stepper. */
export const SingleDecision: Story = {
  render: () => (
    <InteractiveReview
      data={{ ...mockData, decisions: [mockData.decisions[0]] }}
      onApprove={fn().mockName('onApprove')}
    />
  ),
};

/** No technologies listed. */
export const NoTechnologies: Story = {
  render: () => (
    <InteractiveReview
      data={{ ...mockData, technologies: [] }}
      onApprove={fn().mockName('onApprove')}
    />
  ),
};

/* ─── Drawer Variant ─── */

type DrawerStory = StoryObj<typeof TechDecisionsDrawer>;

const drawerMeta = {
  title: 'Composed/TechDecisionsDrawer',
  component: TechDecisionsDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

function DrawerTemplate(
  props: Omit<
    React.ComponentProps<typeof TechDecisionsDrawer>,
    'open' | 'onClose' | 'selections' | 'onSelect'
  >
) {
  const [open, setOpen] = useState(true);
  const [selections, setSelections] = useState<Record<number, string>>({});

  return (
    <div style={{ height: '100vh', background: '#f8fafc', padding: '2rem' }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px' }}
      >
        Open Drawer
      </button>
      <TechDecisionsDrawer
        {...props}
        open={open}
        onClose={() => setOpen(false)}
        selections={selections}
        onSelect={(idx, val) => setSelections((prev) => ({ ...prev, [idx]: val }))}
      />
    </div>
  );
}

/** Drawer with tech decision stepper. */
export const InDrawer: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="Agent Executor Abstraction"
      featureId="FEAT-099"
      data={mockData}
      onApprove={fn().mockName('onApprove')}
    />
  ),
};

/** Drawer with delete button visible. */
export const WithDeleteButton: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="Agent Executor Abstraction"
      featureId="FEAT-099"
      data={mockData}
      onApprove={fn().mockName('onApprove')}
      onDelete={fn().mockName('onDelete')}
    />
  ),
};

/** Drawer with delete in progress (button disabled). */
export const DeletingState: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="Agent Executor Abstraction"
      featureId="FEAT-099"
      data={mockData}
      onApprove={fn().mockName('onApprove')}
      onDelete={fn().mockName('onDelete')}
      isDeleting
    />
  ),
};
