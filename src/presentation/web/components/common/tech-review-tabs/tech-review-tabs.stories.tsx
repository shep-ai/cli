import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TechReviewTabs } from './tech-review-tabs';
import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import type { ProductDecisionsSummaryData } from '@/components/common/product-decisions-summary';

const mockTechData: TechDecisionsReviewData = {
  name: 'Agent Executor Abstraction',
  summary:
    'Research into the best approach for abstracting agent executors to support multiple AI backends.',
  technologies: ['TypeScript', 'tsyringe', 'LangGraph', 'Claude API'],
  decisions: [
    {
      title: 'Agent Execution Framework',
      chosen: 'LangGraph',
      rejected: ['Custom state machine', 'Temporal.io', 'Step Functions'],
      rationale:
        'LangGraph provides built-in checkpointing, human-in-the-loop support, and integrates natively with LangChain.',
    },
    {
      title: 'Dependency Injection',
      chosen: 'tsyringe',
      rejected: ['InversifyJS', 'TypeDI', 'Manual DI'],
      rationale: 'tsyringe is lightweight, uses standard decorators, and has minimal overhead.',
    },
    {
      title: 'Inter-Process Communication',
      chosen: 'Server-Sent Events (SSE)',
      rejected: ['WebSockets', 'Long Polling', 'gRPC'],
      rationale:
        'SSE provides a simple one-way streaming protocol for agent status updates to the UI.',
    },
  ],
};

const mockProductData: ProductDecisionsSummaryData = {
  question: 'Goal',
  context: 'Add multi-agent support to the platform',
  questions: [
    {
      question: 'Which authentication strategy should we use?',
      selectedOption: 'OAuth 2.0',
      rationale: 'Industry standard with broad provider support.',
      wasRecommended: true,
    },
    {
      question: 'How should we handle session management?',
      selectedOption: 'JWT tokens',
      rationale: 'Stateless and scalable across services.',
      wasRecommended: false,
    },
    {
      question: 'What level of MFA should we support?',
      selectedOption: 'Optional TOTP',
      rationale: 'Balances security with user convenience.',
      wasRecommended: true,
    },
  ],
};

const meta: Meta<typeof TechReviewTabs> = {
  title: 'Drawers/Review/TechReviewTabs',
  component: TechReviewTabs,
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
type Story = StoryObj<typeof TechReviewTabs>;

/** Default — both tabs with data, Technical tab active. */
export const Default: Story = {
  args: {
    techData: mockTechData,
    productData: mockProductData,
    onReject: fn().mockName('onReject'),
    onApprove: fn().mockName('onApprove'),
  },
};

/** Product data loading — spinner in the Product tab. */
export const ProductDataLoading: Story = {
  args: {
    techData: mockTechData,
    productData: null,
    onReject: fn().mockName('onReject'),
    onApprove: fn().mockName('onApprove'),
  },
};

/** Product data unavailable — fallback message in the Product tab. */
export const ProductDataUnavailable: Story = {
  args: {
    techData: mockTechData,
    productData: undefined,
    onReject: fn().mockName('onReject'),
    onApprove: fn().mockName('onApprove'),
  },
};

/** Processing state — approve button disabled. */
export const Processing: Story = {
  args: {
    techData: mockTechData,
    productData: mockProductData,
    onApprove: fn().mockName('onApprove'),
    isProcessing: true,
  },
};

/** Rejecting state — reject input disabled. */
export const Rejecting: Story = {
  args: {
    techData: mockTechData,
    productData: mockProductData,
    onReject: fn().mockName('onReject'),
    onApprove: fn().mockName('onApprove'),
    isRejecting: true,
  },
};
