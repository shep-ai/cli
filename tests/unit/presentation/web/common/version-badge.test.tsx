import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VersionBadge } from '@/components/common/version-badge';

describe('VersionBadge', () => {
  it('renders the version label', () => {
    render(<VersionBadge version="1.90.0" />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('v1.90.0');
  });

  it('shows branch in dev mode', () => {
    render(<VersionBadge version="1.90.0" isDev branch="feat/my-feature" />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('feat/my-feature');
  });

  it('shows dev label in dev mode', () => {
    render(<VersionBadge version="1.90.0" isDev />);
    expect(screen.getByTestId('version-label')).toHaveTextContent('dev');
  });

  it('does not show branch in production mode', () => {
    render(<VersionBadge version="1.90.0" branch="main" />);
    expect(screen.getByTestId('version-label')).not.toHaveTextContent('main');
  });

  it('applies cyan styling in dev mode', () => {
    render(<VersionBadge version="1.90.0" isDev />);
    const label = screen.getByTestId('version-label');
    expect(label.className).toContain('cyan');
  });

  it('renders the info tooltip trigger', () => {
    render(<VersionBadge version="1.90.0" />);
    expect(screen.getByTestId('version-info-trigger')).toBeInTheDocument();
  });
});
