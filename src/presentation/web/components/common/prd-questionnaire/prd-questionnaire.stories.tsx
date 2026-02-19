import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PrdQuestionnaire } from './prd-questionnaire';
import { PrdQuestionnaireDrawer } from './prd-questionnaire-drawer';
import type { PrdQuestionnaireData } from './prd-questionnaire-config';

const mockQuestions: PrdQuestionnaireData['questions'] = [
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
      { id: 'p1', label: 'P1 - High', rationale: 'Important for next release', recommended: true },
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

const mockFinalAction = {
  id: 'approve-reqs',
  label: 'Approve Requirements',
  description: 'Finalize and lock the requirements for implementation',
};

/* ─── Standalone PrdQuestionnaire ─── */

const meta: Meta<typeof PrdQuestionnaire> = {
  title: 'Composed/PrdQuestionnaire',
  component: PrdQuestionnaire,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onSelect: { action: 'onSelect' },
    onRefine: { action: 'onRefine' },
    onApprove: { action: 'onApprove' },
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
type Story = StoryObj<typeof PrdQuestionnaire>;

/** Default state with all questions, no selections, not processing. */
export const Default: Story = {
  args: {
    data: {
      question: 'Review Feature Requirements',
      context:
        'Please review the AI-generated requirements below. Select the best option for each question, or ask the AI to refine them.',
      questions: mockQuestions,
      finalAction: mockFinalAction,
    },
    selections: {},
    isProcessing: false,
  },
};

/** Partial selections — 3 of 6 questions answered. */
export const WithSelections: Story = {
  args: {
    ...Default.args,
    selections: {
      problem: 'user_pain',
      priority: 'p1',
      success: 'adoption',
    },
  },
};

/** All 6 questions answered — full progress bar. */
export const AllAnswered: Story = {
  args: {
    ...Default.args,
    selections: {
      problem: 'user_pain',
      priority: 'p1',
      success: 'adoption',
      timeline: 'sprint',
      scope: 'mvp',
      stakeholders: 'end_users',
    },
  },
};

/** Processing state — all inputs disabled, indeterminate progress bar. */
export const Refining: Story = {
  args: {
    ...Default.args,
    selections: {
      problem: 'user_pain',
      priority: 'p1',
    },
    isProcessing: true,
  },
};

/** Minimal data — single question with 2 options. */
export const MinimalData: Story = {
  args: {
    data: {
      question: 'Quick Check',
      context: 'A simple yes/no decision.',
      questions: [
        {
          id: 'confirm',
          question: 'Should we proceed?',
          type: 'select' as const,
          options: [
            {
              id: 'yes',
              label: 'Yes',
              rationale: 'Proceed with implementation',
              recommended: true,
            },
            { id: 'no', label: 'No', rationale: 'Go back and reconsider' },
          ],
        },
      ],
      finalAction: { id: 'confirm-action', label: 'Confirm', description: 'Confirm the decision' },
    },
    selections: {},
    isProcessing: false,
  },
};

/* ─── Drawer Variant ─── */

type DrawerStory = StoryObj<typeof PrdQuestionnaireDrawer>;

const drawerMeta = {
  title: 'Composed/PrdQuestionnaireDrawer',
  component: PrdQuestionnaireDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

function DrawerTemplate({
  selections: initialSelections = {},
  ...props
}: Omit<
  React.ComponentProps<typeof PrdQuestionnaireDrawer>,
  'open' | 'onClose' | 'onSelect' | 'onRefine' | 'onApprove' | 'selections'
> & { selections?: Record<string, string> }) {
  const [open, setOpen] = useState(true);
  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);

  return (
    <div style={{ height: '100vh', background: '#f8fafc', padding: '2rem' }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px' }}
      >
        Open Drawer
      </button>
      <PrdQuestionnaireDrawer
        {...props}
        open={open}
        onClose={() => setOpen(false)}
        selections={selections}
        onSelect={(qId, optId) => setSelections((prev) => ({ ...prev, [qId]: optId }))}
        onRefine={fn().mockName('onRefine')}
        onApprove={fn().mockName('onApprove')}
      />
    </div>
  );
}

const mockData: PrdQuestionnaireData = {
  question: 'Review Feature Requirements',
  context:
    'Please review the AI-generated requirements below. Select the best option for each question, or ask the AI to refine them.',
  questions: mockQuestions,
  finalAction: mockFinalAction,
};

/** Drawer with all questions, empty selections. */
export const InDrawer: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="User Authentication Flow"
      featureId="FEAT-042"
      lifecycleLabel="Requirements"
      data={mockData}
    />
  ),
};

/** Drawer with partial selections showing progress. */
export const InDrawerWithSelections: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="User Authentication Flow"
      featureId="FEAT-042"
      lifecycleLabel="Requirements"
      data={mockData}
      selections={{
        problem: 'user_pain',
        priority: 'p1',
        success: 'adoption',
      }}
    />
  ),
};

/** Drawer with delete button visible. */
export const WithDeleteButton: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="User Authentication Flow"
      featureId="FEAT-042"
      lifecycleLabel="Requirements"
      data={mockData}
      onDelete={fn().mockName('onDelete')}
    />
  ),
};

/** Drawer with delete in progress (button disabled). */
export const DeletingState: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="User Authentication Flow"
      featureId="FEAT-042"
      lifecycleLabel="Requirements"
      data={mockData}
      onDelete={fn().mockName('onDelete')}
      isDeleting
    />
  ),
};
