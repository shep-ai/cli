import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DatabaseSettingsSection } from '@/components/features/settings/database-settings-section';

describe('DatabaseSettingsSection', () => {
  it('renders SHEP_HOME path text', () => {
    render(<DatabaseSettingsSection shepHome="/home/user/.shep" dbFileSize="2.4 MB" />);
    expect(screen.getByTestId('shep-home-path').textContent).toBe('/home/user/.shep');
  });

  it('renders database file size text', () => {
    render(<DatabaseSettingsSection shepHome="/home/user/.shep" dbFileSize="2.4 MB" />);
    expect(screen.getByTestId('db-file-size').textContent).toBe('2.4 MB');
  });

  it('does not render a Save button', () => {
    render(<DatabaseSettingsSection shepHome="/home/user/.shep" dbFileSize="2.4 MB" />);
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('renders title and description', () => {
    render(<DatabaseSettingsSection shepHome="/home/user/.shep" dbFileSize="2.4 MB" />);
    expect(screen.getByText('Database Location')).toBeDefined();
    expect(
      screen.getByText('Information about your Shep data directory and database')
    ).toBeDefined();
  });
});
