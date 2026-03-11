import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VersionBadge } from '@/components/common/version-badge';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
  // Default: no update available
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ latest: '1.90.0' }),
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('VersionBadge', () => {
  it('renders the version in production mode', () => {
    render(<VersionBadge version="1.90.0" />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('v1.90.0');
  });

  it('shows version-dev in dev mode', () => {
    render(<VersionBadge version="1.90.0" isDev commitHash="abc1234def5678" />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('1.90.0-dev');
  });

  it('shows version-dev without hash when no commit provided', () => {
    render(<VersionBadge version="1.90.0" isDev />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('1.90.0-dev');
  });

  it('does not show branch inline in production mode', () => {
    render(<VersionBadge version="1.90.0" branch="main" />);
    expect(screen.getByTestId('version-label')).not.toHaveTextContent('main');
  });

  it('version label is the tooltip trigger', () => {
    render(<VersionBadge version="1.90.0" />);
    const label = screen.getByTestId('version-label');
    expect(label.tagName.toLowerCase()).toBe('span');
  });

  it('shows update dot when a newer version is available', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latest: '2.0.0' }),
    });

    render(<VersionBadge version="1.90.0" />);

    await waitFor(() => {
      expect(screen.getByTestId('update-dot')).toBeInTheDocument();
    });
  });

  it('does not show update dot when on latest version', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latest: '1.90.0' }),
    });

    render(<VersionBadge version="1.90.0" />);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('update-dot')).not.toBeInTheDocument();
  });

  it('shows upgrade link in tooltip when update is available', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latest: '2.0.0' }),
    });

    const user = userEvent.setup();
    render(<VersionBadge version="1.90.0" />);

    await waitFor(() => {
      expect(screen.getByTestId('update-dot')).toBeInTheDocument();
    });

    // Hover over the version to open tooltip
    await user.hover(screen.getByTestId('version-label'));

    await waitFor(() => {
      const links = screen.getAllByTestId('upgrade-link');
      expect(links.length).toBeGreaterThan(0);
      const link = links[0];
      expect(link).toHaveTextContent('Upgrade to v2.0.0');
      expect(link).toHaveAttribute('href', 'https://www.npmjs.com/package/@shepai/cli');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});
