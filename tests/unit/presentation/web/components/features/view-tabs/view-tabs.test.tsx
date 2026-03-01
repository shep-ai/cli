import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewTabs } from '@/components/features/view-tabs';

// --- Mocks ---

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/',
}));

describe('ViewTabs', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  it('defaults to board tab when no ?view param in URL', () => {
    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board</div>}
        mapContent={<div data-testid="map">Map</div>}
      />
    );

    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });

  it('selects Map tab when ?view=map is in URL', () => {
    mockSearchParams = new URLSearchParams('view=map');

    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board</div>}
        mapContent={<div data-testid="map">Map</div>}
      />
    );

    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.queryByTestId('board')).not.toBeInTheDocument();
  });

  it('clicking Map tab updates URL to ?view=map', async () => {
    const user = userEvent.setup();

    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board</div>}
        mapContent={<div data-testid="map">Map</div>}
      />
    );

    await user.click(screen.getByRole('tab', { name: /map/i }));

    expect(mockReplace).toHaveBeenCalledWith('/?view=map');
  });

  it('clicking Board tab updates URL to board view', async () => {
    mockSearchParams = new URLSearchParams('view=map');
    const user = userEvent.setup();

    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board</div>}
        mapContent={<div data-testid="map">Map</div>}
      />
    );

    await user.click(screen.getByRole('tab', { name: /board/i }));

    expect(mockReplace).toHaveBeenCalledWith('/?view=board');
  });

  it('renders board content when board tab is active', () => {
    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board Content</div>}
        mapContent={<div data-testid="map">Map Content</div>}
      />
    );

    expect(screen.getByTestId('board')).toHaveTextContent('Board Content');
  });

  it('renders map content when map tab is active', () => {
    mockSearchParams = new URLSearchParams('view=map');

    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board Content</div>}
        mapContent={<div data-testid="map">Map Content</div>}
      />
    );

    expect(screen.getByTestId('map')).toHaveTextContent('Map Content');
  });

  it('preserves other URL params when switching tabs', async () => {
    mockSearchParams = new URLSearchParams('status=running&lifecycle=implementation');
    const user = userEvent.setup();

    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board</div>}
        mapContent={<div data-testid="map">Map</div>}
      />
    );

    await user.click(screen.getByRole('tab', { name: /map/i }));

    // Should preserve existing params
    const calledUrl = mockReplace.mock.calls[0][0] as string;
    expect(calledUrl).toContain('view=map');
    expect(calledUrl).toContain('status=running');
    expect(calledUrl).toContain('lifecycle=implementation');
  });

  it('renders Board and Map tab triggers', () => {
    render(<ViewTabs boardContent={<div>Board</div>} mapContent={<div>Map</div>} />);

    expect(screen.getByRole('tab', { name: /board/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /map/i })).toBeInTheDocument();
  });

  it('falls back to board for unknown ?view values', () => {
    mockSearchParams = new URLSearchParams('view=unknown');

    render(
      <ViewTabs
        boardContent={<div data-testid="board">Board</div>}
        mapContent={<div data-testid="map">Map</div>}
      />
    );

    expect(screen.getByTestId('board')).toBeInTheDocument();
    expect(screen.queryByTestId('map')).not.toBeInTheDocument();
  });
});
