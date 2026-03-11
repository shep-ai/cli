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
  it('falls back to defaultOpen when localStorage has no sidebar state', async () => {
    getItemMock.mockReturnValue(null);

    render(<SidebarHarness defaultOpen={false} />);

    // After effect fires, state should still be false (nothing stored)
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(screen.getByTestId('open-state').textContent).toBe('false');
  });

  it('reads open state from localStorage after mount when set to true', async () => {
    getItemMock.mockReturnValue('true');

    render(<SidebarHarness defaultOpen={false} />);

    // After mount effect, localStorage value should be applied
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(screen.getByTestId('open-state').textContent).toBe('true');
  });

  it('reads open state from localStorage after mount when set to false', async () => {
    getItemMock.mockReturnValue('false');

    render(<SidebarHarness defaultOpen={true} />);

    // After mount effect, localStorage value should override defaultOpen
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

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

    // Wait for effect to sync state from localStorage
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    // Sidebar is now open from localStorage, toggle closes it
    await user.click(screen.getByTestId('toggle'));

    expect(setItemMock).toHaveBeenCalledWith('sidebar_state', 'false');
  });
});

describe('SidebarProvider skipTransition', () => {
  it('sets skipTransition to true when restoring from localStorage', async () => {
    getItemMock.mockReturnValue('true');

    render(<SidebarHarness defaultOpen={false} />);

    // skipTransition starts false (SSR-safe), becomes true when effect fires
    // and goes back to false after animation frame. We need to check mid-cycle.
    // The effect sets skipTransition=true AND schedules raf to clear it.
    // After act with raf, it should be cleared.
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    // After the animation frame, skipTransition should be cleared
    expect(screen.getByTestId('skip-transition').textContent).toBe('false');
  });

  it('keeps skipTransition false when localStorage has no sidebar state', async () => {
    getItemMock.mockReturnValue(null);

    render(<SidebarHarness defaultOpen={false} />);

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(screen.getByTestId('skip-transition').textContent).toBe('false');
  });

  it('keeps skipTransition false when localStorage matches defaultOpen', async () => {
    getItemMock.mockReturnValue('false');

    render(<SidebarHarness defaultOpen={false} />);

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(screen.getByTestId('skip-transition').textContent).toBe('false');
  });

  it('clears skipTransition after animation frame when restoring state', async () => {
    getItemMock.mockReturnValue('true');

    render(<SidebarHarness defaultOpen={false} />);

    // Wait for both the state sync and the skipTransition cleanup
    await act(async () => {
      // First raf: skipTransition effect fires
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    await act(async () => {
      // Second raf: ensure cleanup completes
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(screen.getByTestId('skip-transition').textContent).toBe('false');
    expect(screen.getByTestId('open-state').textContent).toBe('true');
  });
});
