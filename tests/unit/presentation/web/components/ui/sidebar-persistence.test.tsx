import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  SidebarProvider,
  useSidebar,
  SIDEBAR_STORAGE_KEY,
} from '../../../../../../src/presentation/web/components/ui/sidebar.js';

/** Renders SidebarProvider with a child that exposes sidebar state + toggle. */
function TestHarness({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarStateDisplay />
    </SidebarProvider>
  );
}

function SidebarStateDisplay() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <div>
      <span data-testid="sidebar-state">{open ? 'open' : 'closed'}</span>
      <button data-testid="toggle" onClick={toggleSidebar}>
        Toggle
      </button>
    </div>
  );
}

describe('SidebarProvider — localStorage persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization from localStorage', () => {
    it('defaults to closed when localStorage is empty and defaultOpen is false', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      render(<TestHarness defaultOpen={false} />);

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');
      expect(localStorage.getItem).toHaveBeenCalledWith(SIDEBAR_STORAGE_KEY);
    });

    it('defaults to open when localStorage is empty and defaultOpen is true', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      render(<TestHarness defaultOpen={true} />);

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');
    });

    it('restores open state from localStorage after hydration', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('true');

      render(<TestHarness defaultOpen={false} />);

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');
      });
    });

    it('restores closed state from localStorage after hydration', async () => {
      vi.mocked(localStorage.getItem).mockReturnValue('false');

      render(<TestHarness defaultOpen={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');
      });
    });

    it('falls back to defaultOpen when localStorage has unexpected value', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('garbage');

      render(<TestHarness defaultOpen={false} />);

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('closed');
    });

    it('falls back to defaultOpen when localStorage.getItem throws', () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('SecurityError');
      });

      render(<TestHarness defaultOpen={true} />);

      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');
    });
  });

  describe('persisting state changes', () => {
    it('saves to localStorage when sidebar is toggled open', async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      render(<TestHarness defaultOpen={false} />);

      await user.click(screen.getByTestId('toggle'));

      expect(localStorage.setItem).toHaveBeenCalledWith(SIDEBAR_STORAGE_KEY, 'true');
    });

    it('saves to localStorage when sidebar is toggled closed', async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      render(<TestHarness defaultOpen={true} />);

      await user.click(screen.getByTestId('toggle'));

      expect(localStorage.setItem).toHaveBeenCalledWith(SIDEBAR_STORAGE_KEY, 'false');
    });

    it('does not throw when localStorage.setItem fails', async () => {
      const user = userEvent.setup();
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      render(<TestHarness defaultOpen={false} />);

      // Should not throw
      await expect(user.click(screen.getByTestId('toggle'))).resolves.not.toThrow();
      expect(screen.getByTestId('sidebar-state')).toHaveTextContent('open');
    });
  });
});
