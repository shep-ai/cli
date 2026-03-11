import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar';

/** Helper that renders a SidebarProvider and exposes sidebar context via a test harness. */
function SidebarHarness(props: React.ComponentProps<typeof SidebarProvider>) {
  return (
    <SidebarProvider {...props}>
      <SidebarConsumer />
    </SidebarProvider>
  );
}

function SidebarConsumer() {
  const { open, toggleSidebar, skipTransition } = useSidebar();
  return (
    <div>
      <span data-testid="open-state">{String(open)}</span>
      <span data-testid="skip-transition">{String(skipTransition)}</span>
      <button data-testid="toggle" onClick={toggleSidebar}>
        Toggle
      </button>
    </div>
  );
}

const getItemMock = localStorage.getItem as ReturnType<typeof vi.fn>;
const setItemMock = localStorage.setItem as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: desktop viewport so toggleSidebar uses setOpen (not setOpenMobile).
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
});

describe('SidebarProvider localStorage persistence', () => {
  it('falls back to defaultOpen when localStorage has no sidebar state', () => {
    getItemMock.mockReturnValue(null);

    render(<SidebarHarness defaultOpen={false} />);

    expect(screen.getByTestId('open-state').textContent).toBe('false');
  });

  it('reads initial open state from localStorage when set to true', () => {
    getItemMock.mockReturnValue('true');

    render(<SidebarHarness defaultOpen={false} />);

    expect(screen.getByTestId('open-state').textContent).toBe('true');
  });

  it('reads initial open state from localStorage when set to false', () => {
    getItemMock.mockReturnValue('false');

    render(<SidebarHarness defaultOpen={true} />);

    expect(screen.getByTestId('open-state').textContent).toBe('false');
  });

  it('persists state to localStorage when toggled open', async () => {
    getItemMock.mockReturnValue(null);
    const user = userEvent.setup();
    render(<SidebarHarness defaultOpen={false} />);

    await user.click(screen.getByTestId('toggle'));

    expect(setItemMock).toHaveBeenCalledWith('sidebar_state', 'true');
  });

  it('persists state to localStorage when toggled closed', async () => {
    getItemMock.mockReturnValue('true');
    const user = userEvent.setup();
    render(<SidebarHarness defaultOpen={false} />);

    // Sidebar starts open from localStorage, toggle closes it
    await user.click(screen.getByTestId('toggle'));

    expect(setItemMock).toHaveBeenCalledWith('sidebar_state', 'false');
  });
});

describe('SidebarProvider skipTransition', () => {
  it('sets skipTransition to true when localStorage has sidebar_state=true', () => {
    getItemMock.mockReturnValue('true');

    render(<SidebarHarness defaultOpen={false} />);

    expect(screen.getByTestId('skip-transition').textContent).toBe('true');
  });

  it('sets skipTransition to false when localStorage has no sidebar state', () => {
    getItemMock.mockReturnValue(null);

    render(<SidebarHarness defaultOpen={false} />);

    expect(screen.getByTestId('skip-transition').textContent).toBe('false');
  });

  it('sets skipTransition to false when localStorage has sidebar_state=false', () => {
    getItemMock.mockReturnValue('false');

    render(<SidebarHarness defaultOpen={false} />);

    expect(screen.getByTestId('skip-transition').textContent).toBe('false');
  });

  it('clears skipTransition after first animation frame', async () => {
    getItemMock.mockReturnValue('true');

    render(<SidebarHarness defaultOpen={false} />);

    // Initially skipTransition is true
    expect(screen.getByTestId('skip-transition').textContent).toBe('true');

    // After an animation frame, it should be cleared
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(screen.getByTestId('skip-transition').textContent).toBe('false');
  });
});
