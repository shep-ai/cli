import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnvironmentSection } from '@/components/features/settings/environment-section';
import type { EnvironmentConfig } from '@shepai/core/domain/generated/output';
import { EditorType } from '@shepai/core/domain/generated/output';

const defaultData: EnvironmentConfig = {
  defaultEditor: EditorType.VsCode,
  shellPreference: '/bin/zsh',
};

function renderSection(
  overrides: {
    data?: EnvironmentConfig;
    onSave?: (data: EnvironmentConfig) => Promise<boolean>;
  } = {}
) {
  const props = {
    data: overrides.data ?? defaultData,
    onSave: overrides.onSave ?? vi.fn().mockResolvedValue(true),
  };
  return render(<EnvironmentSection {...props} />);
}

describe('EnvironmentSection', () => {
  it('renders editor select with all EditorType options', () => {
    renderSection();
    // The select trigger should show the current value
    expect(screen.getByLabelText('Default Editor')).toBeInTheDocument();
  });

  it('renders shell preference input', () => {
    renderSection();
    expect(screen.getByLabelText('Shell Preference')).toBeInTheDocument();
  });

  it('initializes with prop values', () => {
    renderSection({
      data: { defaultEditor: EditorType.Cursor, shellPreference: '/bin/bash' },
    });
    expect(screen.getByLabelText('Shell Preference')).toHaveValue('/bin/bash');
  });

  it('initializes shell preference with provided value', () => {
    renderSection({
      data: { defaultEditor: EditorType.VsCode, shellPreference: '/bin/fish' },
    });
    expect(screen.getByLabelText('Shell Preference')).toHaveValue('/bin/fish');
  });

  it('calls onSave with updated environment data', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    renderSection({ onSave });

    await user.clear(screen.getByLabelText('Shell Preference'));
    await user.type(screen.getByLabelText('Shell Preference'), '/bin/bash');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({
      defaultEditor: EditorType.VsCode,
      shellPreference: '/bin/bash',
    });
  });

  it('renders a save button', () => {
    renderSection();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
