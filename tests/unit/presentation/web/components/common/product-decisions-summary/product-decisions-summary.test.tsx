import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductDecisionsSummary } from '@/components/common/product-decisions-summary';
import type { ProductDecisionsSummaryData } from '@/components/common/product-decisions-summary';

const mockData: ProductDecisionsSummaryData = {
  question: 'Goal',
  context: 'Add user authentication to the app',
  questions: [
    {
      question: 'Which authentication strategy should we use?',
      selectedOption: 'OAuth 2.0',
      rationale: 'Industry standard with broad provider support',
      wasRecommended: true,
    },
    {
      question: 'How should we handle session management?',
      selectedOption: 'JWT tokens',
      rationale: 'Stateless and scalable across services',
      wasRecommended: false,
    },
    {
      question: 'What level of MFA should we support?',
      selectedOption: 'Optional TOTP',
      rationale: 'Balances security with user convenience',
      wasRecommended: true,
    },
  ],
};

describe('ProductDecisionsSummary', () => {
  describe('basic rendering', () => {
    it('renders the section heading', () => {
      render(<ProductDecisionsSummary data={mockData} />);

      expect(screen.getByText('Product Decisions')).toBeInTheDocument();
    });

    it('renders all question cards', () => {
      render(<ProductDecisionsSummary data={mockData} />);

      expect(screen.getByText('Which authentication strategy should we use?')).toBeInTheDocument();
      expect(screen.getByText('How should we handle session management?')).toBeInTheDocument();
      expect(screen.getByText('What level of MFA should we support?')).toBeInTheDocument();
    });

    it('renders numbered indicators for each card', () => {
      render(<ProductDecisionsSummary data={mockData} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders the selected option for each question', () => {
      render(<ProductDecisionsSummary data={mockData} />);

      expect(screen.getByText('OAuth 2.0')).toBeInTheDocument();
      expect(screen.getByText('JWT tokens')).toBeInTheDocument();
      expect(screen.getByText('Optional TOTP')).toBeInTheDocument();
    });

    it('does not render rationale text', () => {
      render(<ProductDecisionsSummary data={mockData} />);

      expect(
        screen.queryByText('Industry standard with broad provider support')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Stateless and scalable across services')).not.toBeInTheDocument();
    });
  });

  describe('recommended badge', () => {
    it('shows AI Recommended badge for recommended items', () => {
      render(<ProductDecisionsSummary data={mockData} />);

      const badges = screen.getAllByText('AI Recommended');
      expect(badges).toHaveLength(2);
    });

    it('does not show badge for non-recommended items', () => {
      const singleNonRecommended: ProductDecisionsSummaryData = {
        ...mockData,
        questions: [mockData.questions[1]], // wasRecommended: false
      };
      render(<ProductDecisionsSummary data={singleNonRecommended} />);

      expect(screen.queryByText('AI Recommended')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('returns null when questions array is empty', () => {
      const { container } = render(
        <ProductDecisionsSummary data={{ ...mockData, questions: [] }} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders a single question correctly', () => {
      const singleQuestion: ProductDecisionsSummaryData = {
        ...mockData,
        questions: [mockData.questions[0]],
      };
      render(<ProductDecisionsSummary data={singleQuestion} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Which authentication strategy should we use?')).toBeInTheDocument();
      expect(screen.getByText('OAuth 2.0')).toBeInTheDocument();
    });
  });
});
