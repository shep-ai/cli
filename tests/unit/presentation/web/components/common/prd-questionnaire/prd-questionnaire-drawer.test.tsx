import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrdQuestionnaireDrawer } from '@/components/common/prd-questionnaire';
import type { PrdQuestionnaireDrawerProps } from '@/components/common/prd-questionnaire';

const mockData: PrdQuestionnaireDrawerProps['data'] = {
  question: 'Review Requirements',
  context: 'Please review.',
  questions: [
    {
      id: 'q-1',
      question: 'What problem?',
      type: 'select',
      options: [
        { id: 'opt-a', label: 'Pain Point', rationale: 'User pain' },
        { id: 'opt-b', label: 'Feature Gap', rationale: 'Market gap' },
      ],
    },
  ],
  finalAction: { id: 'approve', label: 'Approve', description: 'Approve it' },
};

const baseProps: PrdQuestionnaireDrawerProps = {
  open: true,
  onClose: vi.fn(),
  featureName: 'Auth Flow',
  featureId: 'FEAT-042',
  lifecycleLabel: 'REQUIREMENTS',
  repositoryPath: '/tmp/test-repo',
  branch: 'feat/test',
  data: mockData,
  selections: {},
  onSelect: vi.fn(),
  onRefine: vi.fn(),
  onApprove: vi.fn(),
};

describe('PrdQuestionnaireDrawer delete button', () => {
  it('renders delete button when onDelete is provided', () => {
    render(<PrdQuestionnaireDrawer {...baseProps} onDelete={vi.fn()} />);

    expect(screen.getByTestId('review-drawer-delete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete feature/i })).toBeInTheDocument();
  });

  it('does not render delete button when onDelete is undefined', () => {
    render(<PrdQuestionnaireDrawer {...baseProps} />);

    expect(screen.queryByTestId('review-drawer-delete')).not.toBeInTheDocument();
  });

  it('does not render delete button when featureId is undefined', () => {
    render(<PrdQuestionnaireDrawer {...baseProps} featureId={undefined} onDelete={vi.fn()} />);

    expect(screen.queryByTestId('review-drawer-delete')).not.toBeInTheDocument();
  });

  it('opens confirmation dialog with feature name and id', () => {
    render(<PrdQuestionnaireDrawer {...baseProps} onDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));

    expect(screen.getByText(/delete feature\?/i)).toBeInTheDocument();
    const description = screen.getByText(/permanently delete/i);
    expect(description).toHaveTextContent('Auth Flow');
    expect(description).toHaveTextContent('FEAT-042');
  });

  it('calls onDelete with featureId when confirmed', () => {
    const onDelete = vi.fn();
    render(<PrdQuestionnaireDrawer {...baseProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(onDelete).toHaveBeenCalledWith('FEAT-042');
  });

  it('does not call onDelete when cancelled', () => {
    const onDelete = vi.fn();
    render(<PrdQuestionnaireDrawer {...baseProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete feature/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('disables delete trigger button when isDeleting is true', () => {
    render(<PrdQuestionnaireDrawer {...baseProps} onDelete={vi.fn()} isDeleting />);

    expect(screen.getByRole('button', { name: /delete feature/i })).toBeDisabled();
  });
});
