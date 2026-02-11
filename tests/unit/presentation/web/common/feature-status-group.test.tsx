import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FeatureStatusGroup } from '@/components/common/feature-status-group';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}

describe('FeatureStatusGroup', () => {
  it('renders status label text', () => {
    renderWithSidebar(
      <FeatureStatusGroup label="In Progress" count={3}>
        <div>child</div>
      </FeatureStatusGroup>
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows count badge with correct number', () => {
    renderWithSidebar(
      <FeatureStatusGroup label="Action Needed" count={5}>
        <div>child</div>
      </FeatureStatusGroup>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders children inside the group', () => {
    renderWithSidebar(
      <FeatureStatusGroup label="Done" count={2}>
        <div data-testid="child-item">Feature A</div>
        <div data-testid="child-item-2">Feature B</div>
      </FeatureStatusGroup>
    );

    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
  });
});
