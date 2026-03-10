import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionBadge } from '@/components/common/version-badge';

describe('VersionBadge', () => {
  it('renders the version in production mode', () => {
    render(<VersionBadge version="1.90.0" />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('v1.90.0');
  });

  it('shows dev with commit hash in dev mode', () => {
    render(<VersionBadge version="1.90.0" isDev commitHash="abc1234def5678" />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('dev·abc1234');
  });

  it('shows dev without hash when no commit provided', () => {
    render(<VersionBadge version="1.90.0" isDev />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('dev');
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
});
