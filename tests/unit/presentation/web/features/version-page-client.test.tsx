import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import VersionPageClient from '@/components/features/version/version-page-client';

describe('VersionPageClient (features/version)', () => {
  const defaultProps = {
    versionInfo: {
      name: '@shepai/cli',
      version: '1.0.0',
      description: 'Test description',
    },
    systemInfo: {
      nodeVersion: 'v20.0.0',
      platform: 'darwin',
      arch: 'arm64',
    },
  };

  it('renders version info', () => {
    render(<VersionPageClient {...defaultProps} />);
    expect(screen.getByRole('heading', { name: '@shepai/cli' })).toBeInTheDocument();
    expect(screen.getByTestId('version-badge')).toHaveTextContent('v1.0.0');
  });

  it('renders package information tab by default', () => {
    render(<VersionPageClient {...defaultProps} />);
    expect(screen.getByText('Package Information')).toBeInTheDocument();
  });
});
