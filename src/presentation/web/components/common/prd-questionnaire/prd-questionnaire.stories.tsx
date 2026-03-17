import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PrdQuestionnaire } from './prd-questionnaire';
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

/* ─── Interactive wrapper for stories ─── */

function InteractiveQuestionnaire({
  selections: initialSelections = {},
  ...props
}: Omit<React.ComponentProps<typeof PrdQuestionnaire>, 'onSelect' | 'onApprove' | 'selections'> & {
  selections?: Record<string, string>;
}) {
  const [selections, setSelections] = useState<Record<string, string>>(initialSelections);

  return (
    <PrdQuestionnaire
      {...props}
      selections={selections}
      onSelect={(qId, optId) => setSelections((prev) => ({ ...prev, [qId]: optId }))}
      onApprove={fn().mockName('onApprove')}
    />
  );
}

/* ─── Standalone PrdQuestionnaire ─── */

const meta: Meta<typeof PrdQuestionnaire> = {
  title: 'Drawers/Review/PrdQuestionnaire',
  component: PrdQuestionnaire,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onSelect: { action: 'onSelect' },
    onApprove: { action: 'onApprove' },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '760px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PrdQuestionnaire>;

const mockData: PrdQuestionnaireData = {
  question: 'Review Feature Requirements',
  context:
    'Please review the AI-generated requirements below. Select the best option for each question, or ask the AI to refine them.',
  questions: mockQuestions,
  finalAction: mockFinalAction,
};

/** Default state — first step shown, no selections. Click options to auto-advance. Plays "select" on option click, "navigate" on step/nav buttons. */
export const Default: Story = {
  render: () => <InteractiveQuestionnaire data={mockData} />,
};

/** Starting with partial selections — step dots reflect answered state. */
export const WithSelections: Story = {
  render: () => (
    <InteractiveQuestionnaire
      data={mockData}
      selections={{
        problem: 'user_pain',
        priority: 'p1',
        success: 'adoption',
      }}
    />
  ),
};

/** All questions answered — last step shows Approve button enabled. */
export const AllAnswered: Story = {
  render: () => (
    <InteractiveQuestionnaire
      data={mockData}
      selections={{
        problem: 'user_pain',
        priority: 'p1',
        success: 'adoption',
        timeline: 'sprint',
        scope: 'mvp',
        stakeholders: 'end_users',
      }}
    />
  ),
};

/** Processing state — all inputs disabled, indeterminate progress bar. */
export const Refining: Story = {
  args: {
    data: mockData,
    selections: {
      problem: 'user_pain',
      priority: 'p1',
    },
    isProcessing: true,
  },
};

/** Single question — minimal stepper with one step. */
export const MinimalData: Story = {
  render: () => (
    <InteractiveQuestionnaire
      data={{
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
        finalAction: {
          id: 'confirm-action',
          label: 'Confirm',
          description: 'Confirm the decision',
        },
      }}
    />
  ),
};

/* ─── Reject Variants ─── */

const allAnsweredSelections = {
  problem: 'user_pain',
  priority: 'p1',
  success: 'adoption',
  timeline: 'sprint',
  scope: 'mvp',
  stakeholders: 'end_users',
};

/** All answered with reject button visible on last step. */
export const WithRejectButton: Story = {
  render: () => (
    <InteractiveQuestionnaire
      data={mockData}
      selections={allAnsweredSelections}
      onReject={fn().mockName('onReject')}
    />
  ),
};

/** Rejecting state — reject button disabled with spinner while reject action is in flight. */
export const RejectingState: Story = {
  args: {
    data: mockData,
    selections: allAnsweredSelections,
    onReject: fn().mockName('onReject'),
    isRejecting: true,
  },
};

/** Real-world LLM provider question — reproduces exact label text from the reported bug. Badge must stay on one line. */
export const LlmProviderQuestion: Story = {
  render: () => (
    <InteractiveQuestionnaire
      data={{
        question: 'Review Feature Requirements',
        context: 'Testing badge nowrap with real-world LLM provider labels.',
        questions: [
          {
            id: 'llm-provider',
            question: 'Which LLM provider should be the primary AI engine?',
            type: 'select' as const,
            options: [
              {
                id: 'claude-primary',
                label:
                  'Claude (Anthropic) as primary for all AI tasks including vision/OCR, OpenAI as fallback LLM',
                rationale:
                  'Claude is used as the primary engine for all AI tasks: structured reasoning, signal interpretation, opportunity scoring, AND vision/OCR for flyer image extraction.',
                recommended: true,
              },
              {
                id: 'split',
                label: 'Claude (Anthropic) for reasoning, OpenAI Vision for OCR',
                rationale:
                  'Split responsibilities: Claude for text reasoning tasks, OpenAI Vision API specifically for OCR/image analysis.',
              },
              {
                id: 'single',
                label: 'Single provider only (Claude OR OpenAI for everything)',
                rationale:
                  'Simplifies implementation — one SDK, one billing relationship, one prompt format.',
              },
            ],
          },
        ],
        finalAction: mockFinalAction,
      }}
    />
  ),
};

/** Pathological overflow — label with no natural word break (repeating token). Verifies button does not overflow panel. */
export const RepeatingLabelOverflow: Story = {
  render: () => (
    <InteractiveQuestionnaire
      data={{
        question: 'Where should the dark-mode preference be persisted?',
        context: 'Testing overflow containment with no-break label text.',
        questions: [
          {
            id: 'storage',
            question: 'Where should the dark-mode preference be persisted?',
            type: 'select' as const,
            options: [
              {
                id: 'localstorage',
                label:
                  'localStorage only localStorage only localStorage only localStorage only localStorage only localStorage only',
                rationale:
                  'Store the theme preference in localStorage. Zero backend changes, instant read on page load, and no need for API round-trips.',
                recommended: true,
              },
              {
                id: 'sqlite',
                label: 'SQLite settings via backend API',
                rationale:
                  'Persist the preference in the Shep SQLite settings store alongside other settings. Syncs across devices but requires API changes and a settings migration — out of scope for this feature.',
              },
            ],
          },
        ],
        finalAction: mockFinalAction,
      }}
    />
  ),
};

/** Long labels — verifies that AI Recommended badge stays on one line even with very long option labels. Uses 640px width to match real panel width. */
export const LongLabels: Story = {
  render: () => (
    <InteractiveQuestionnaire
      data={{
        question: 'Review Feature Requirements',
        context: 'Testing badge nowrap behavior with long option labels.',
        questions: [
          {
            id: 'long-label',
            question:
              'Which deployment strategy should we use for the distributed microservices architecture?',
            type: 'select' as const,
            options: [
              {
                id: 'opt-long-1',
                label:
                  'Blue-Green Deployment with Automated Canary Analysis and Progressive Rollout',
                rationale:
                  'Minimizes downtime and risk by running two identical production environments',
                recommended: true,
              },
              {
                id: 'opt-long-2',
                label:
                  'Rolling Update with Health Check Verification and Automatic Rollback on Failure',
                rationale: 'Gradually replaces instances with zero-downtime deployment',
              },
              {
                id: 'opt-long-3',
                label:
                  'Feature Flags with Percentage-Based Gradual Rollout to Target User Segments',
                rationale: 'Enables targeted rollout and instant rollback via configuration',
                isNew: true,
              },
            ],
          },
        ],
        finalAction: mockFinalAction,
      }}
    />
  ),
};
