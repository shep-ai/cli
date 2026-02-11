import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders folder and menu action buttons', () => {
    renderWithSidebar(<SidebarSectionHeader label="Features" />);

    expect(screen.getByRole('button', { name: /open features folder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /features options/i })).toBeInTheDocument();
  });

  it('fires onFolderClick when folder button is clicked', async () => {
    const onFolderClick = vi.fn();
    const user = userEvent.setup();

    renderWithSidebar(<SidebarSectionHeader label="Features" onFolderClick={onFolderClick} />);

    await user.click(screen.getByRole('button', { name: /open features folder/i }));

    expect(onFolderClick).toHaveBeenCalledOnce();
  });

  it('fires onMenuClick when menu button is clicked', async () => {
    const onMenuClick = vi.fn();
    const user = userEvent.setup();

    renderWithSidebar(<SidebarSectionHeader label="Features" onMenuClick={onMenuClick} />);

    await user.click(screen.getByRole('button', { name: /features options/i }));

    expect(onMenuClick).toHaveBeenCalledOnce();
  });

  it('applies custom className', () => {
    renderWithSidebar(<SidebarSectionHeader label="Features" className="custom-class" />);

    expect(screen.getByTestId('sidebar-section-header')).toHaveClass('custom-class');
  });
});
