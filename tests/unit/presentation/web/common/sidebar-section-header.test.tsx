import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarSectionHeader } from '@/components/common/sidebar-section-header';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}

describe('SidebarSectionHeader', () => {
  it('renders with data-testid on root', () => {
    renderWithSidebar(<SidebarSectionHeader label="Features" />);

    expect(screen.getByTestId('sidebar-section-header')).toBeInTheDocument();
  });

  it('renders label text', () => {
    renderWithSidebar(<SidebarSectionHeader label="Features" />);

    expect(screen.getByText('Features')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithSidebar(<SidebarSectionHeader label="Features" className="custom-class" />);

    expect(screen.getByTestId('sidebar-section-header')).toHaveClass('custom-class');
  });
});
