import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechReviewTabs } from '@/components/common/tech-review-tabs';
import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import type { ProductDecisionsSummaryData } from '@/components/common/product-decisions-summary';

const mockTechData: TechDecisionsReviewData = {
  name: 'Test Feature',
  summary: 'A test feature summary',
  decisions: [
    {
      title: 'Database Choice',
      chosen: 'PostgreSQL',
      rationale: 'Best for relational data',
      rejected: ['MongoDB', 'SQLite'],
    },
    {
      title: 'API Framework',
      chosen: 'Express',
      rationale: 'Lightweight and flexible',
      rejected: ['Fastify'],
    },
  ],
  technologies: ['TypeScript', 'Node.js'],
};

const mockProductData: ProductDecisionsSummaryData = {
  question: 'Goal',
  context: 'Add user authentication',
  questions: [
    {
      question: 'Which auth strategy?',
      selectedOption: 'OAuth 2.0',
      rationale: 'Industry standard',
      wasRecommended: true,
    },
    {
      question: 'Session management?',
      selectedOption: 'JWT tokens',
      rationale: 'Stateless and scalable',
      wasRecommended: false,
    },
  ],
};

describe('TechReviewTabs', () => {
  describe('tab rendering', () => {
    it('renders Product and Technical tab triggers', () => {
      render(<TechReviewTabs techData={mockTechData} onApprove={vi.fn()} />);

      expect(screen.getByRole('tab', { name: 'Product' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Technical' })).toBeInTheDocument();
    });

    it('shows Technical tab as active by default', () => {
      render(
        <TechReviewTabs techData={mockTechData} productData={mockProductData} onApprove={vi.fn()} />
      );

      const techTab = screen.getByRole('tab', { name: 'Technical' });
      expect(techTab).toHaveAttribute('data-state', 'active');
    });

    it('shows tech decisions content in Technical tab by default', () => {
      render(
        <TechReviewTabs techData={mockTechData} productData={mockProductData} onApprove={vi.fn()} />
      );

      expect(screen.getByText('Database Choice')).toBeInTheDocument();
      expect(screen.getByText('API Framework')).toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('shows product decisions when Product tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TechReviewTabs techData={mockTechData} productData={mockProductData} onApprove={vi.fn()} />
      );

      await user.click(screen.getByRole('tab', { name: 'Product' }));

      expect(screen.getByText('Product Decisions')).toBeInTheDocument();
      expect(screen.getByText('Which auth strategy?')).toBeInTheDocument();
      expect(screen.getByText('OAuth 2.0')).toBeInTheDocument();
    });

    it('hides tech decisions when Product tab is active', async () => {
      const user = userEvent.setup();
      render(
        <TechReviewTabs techData={mockTechData} productData={mockProductData} onApprove={vi.fn()} />
      );

      await user.click(screen.getByRole('tab', { name: 'Product' }));

      expect(screen.queryByText('Database Choice')).not.toBeInTheDocument();
    });
  });

  describe('product data states', () => {
    it('shows loading spinner when productData is null', async () => {
      const user = userEvent.setup();
      render(<TechReviewTabs techData={mockTechData} productData={null} onApprove={vi.fn()} />);

      await user.click(screen.getByRole('tab', { name: 'Product' }));

      expect(screen.getByTestId('product-loading')).toBeInTheDocument();
    });

    it('shows not available message when productData is undefined', async () => {
      const user = userEvent.setup();
      render(<TechReviewTabs techData={mockTechData} onApprove={vi.fn()} />);

      await user.click(screen.getByRole('tab', { name: 'Product' }));

      expect(screen.getByText('No product decisions available.')).toBeInTheDocument();
    });
  });

  describe('shared action bar', () => {
    it('renders approve button', () => {
      render(<TechReviewTabs techData={mockTechData} onApprove={vi.fn()} />);

      expect(screen.getByRole('button', { name: /approve plan/i })).toBeInTheDocument();
    });

    it('calls onApprove when approve button is clicked', () => {
      const onApprove = vi.fn();
      render(<TechReviewTabs techData={mockTechData} onApprove={onApprove} />);

      fireEvent.click(screen.getByRole('button', { name: /approve plan/i }));

      expect(onApprove).toHaveBeenCalledOnce();
    });

    it('renders revision input when onReject is provided', () => {
      const onReject = vi.fn();
      render(<TechReviewTabs techData={mockTechData} onApprove={vi.fn()} onReject={onReject} />);

      expect(screen.getByLabelText('Ask AI to revise the plan...')).toBeInTheDocument();
    });

    it('action bar persists across tab switches', async () => {
      const user = userEvent.setup();
      render(
        <TechReviewTabs
          techData={mockTechData}
          productData={mockProductData}
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );

      // Approve visible on Technical tab
      expect(screen.getByRole('button', { name: /approve plan/i })).toBeInTheDocument();

      // Switch to Product tab
      await user.click(screen.getByRole('tab', { name: 'Product' }));

      // Approve still visible
      expect(screen.getByRole('button', { name: /approve plan/i })).toBeInTheDocument();
    });

    it('disables approve button when isProcessing is true', () => {
      render(<TechReviewTabs techData={mockTechData} onApprove={vi.fn()} isProcessing />);

      expect(screen.getByRole('button', { name: /approve plan/i })).toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('returns null when tech decisions array is empty', () => {
      const { container } = render(
        <TechReviewTabs techData={{ ...mockTechData, decisions: [] }} onApprove={vi.fn()} />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
