import type { Meta, StoryObj } from '@storybook/react';
import { ProductDecisionsSummary } from './product-decisions-summary';
import type { ProductDecisionsSummaryData } from './product-decisions-summary-config';

const mockData: ProductDecisionsSummaryData = {
  question: 'Goal',
  context: 'Add user authentication to the application',
  questions: [
    {
      question: 'Which authentication strategy should we use?',
      selectedOption: 'OAuth 2.0',
      rationale: 'Industry standard with broad provider support and well-maintained libraries.',
      wasRecommended: true,
    },
    {
      question: 'How should we handle session management?',
      selectedOption: 'JWT tokens',
      rationale: 'Stateless and scalable across services without shared session storage.',
      wasRecommended: false,
    },
    {
      question: 'What level of MFA should we support?',
      selectedOption: 'Optional TOTP',
      rationale: 'Balances security with user convenience. Power users can opt in.',
      wasRecommended: true,
    },
    {
      question: 'Where should we store user profiles?',
      selectedOption: 'PostgreSQL',
      rationale: 'Relational data model fits well for user attributes and relationships.',
      wasRecommended: false,
    },
  ],
};

const meta: Meta<typeof ProductDecisionsSummary> = {
  title: 'Drawers/Review/ProductDecisionsSummary',
  component: ProductDecisionsSummary,
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
type Story = StoryObj<typeof ProductDecisionsSummary>;

/** Default — multiple product decisions with a mix of recommended and non-recommended. */
export const Default: Story = {
  args: {
    data: mockData,
  },
};

/** Single question. */
export const SingleQuestion: Story = {
  args: {
    data: { ...mockData, questions: [mockData.questions[0]] },
  },
};

/** All recommended — every option was the AI-recommended choice. */
export const AllRecommended: Story = {
  args: {
    data: {
      ...mockData,
      questions: mockData.questions.map((q) => ({ ...q, wasRecommended: true })),
    },
  },
};

/** No recommended badges — none of the selected options were AI-recommended. */
export const NoneRecommended: Story = {
  args: {
    data: {
      ...mockData,
      questions: mockData.questions.map((q) => ({ ...q, wasRecommended: false })),
    },
  },
};
