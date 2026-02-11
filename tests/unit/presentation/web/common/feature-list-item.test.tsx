import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FeatureListItem } from '@/components/common/feature-list-item';

function renderWithSidebar(ui: React.ReactElement) {
  return render(<SidebarProvider>{ui}</SidebarProvider>);
}

describe('FeatureListItem', () => {
  it('renders feature name text', () => {
    renderWithSidebar(<FeatureListItem name="Auth Module" status="action-needed" />);

    expect(screen.getByText('Auth Module')).toBeInTheDocument();
  });

  it('shows pending/clock icon for action-needed status', () => {
    renderWithSidebar(<FeatureListItem name="Auth Module" status="action-needed" />);

    // Lucide clock/pending icon renders as an SVG
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders ElapsedTime for in-progress status', () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    renderWithSidebar(
      <FeatureListItem name="Auth Module" status="in-progress" startedAt={now - 330_000} />
    );

    // ElapsedTime should render the formatted time (05:30 for 330 seconds)
    expect(screen.getByText('05:30')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('shows duration string for done status', () => {
    renderWithSidebar(<FeatureListItem name="Auth Module" status="done" duration="2h" />);

    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  it('fires onClick callback when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    renderWithSidebar(
      <FeatureListItem name="Auth Module" status="action-needed" onClick={handleClick} />
    );

    await user.click(screen.getByText('Auth Module'));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
