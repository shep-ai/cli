import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ModelConfiguration } from '@shepai/core/domain/generated/output';
import { ModelSettingsSection } from '@/components/features/settings/model-settings-section';

const defaultModels: ModelConfiguration = {
  analyze: 'claude-sonnet-4-5',
  requirements: 'claude-sonnet-4-5',
  plan: 'claude-sonnet-4-5',
  implement: 'claude-sonnet-4-5',
};

describe('ModelSettingsSection', () => {
  it('renders 4 model input fields', () => {
    render(<ModelSettingsSection models={defaultModels} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/analyze/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/requirements/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plan/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/implement/i)).toBeInTheDocument();
  });

  it('initializes inputs with prop values', () => {
    const customModels: ModelConfiguration = {
      analyze: 'gpt-4o',
      requirements: 'claude-opus-4',
      plan: 'gemini-pro',
      implement: 'gpt-4-turbo',
    };

    render(<ModelSettingsSection models={customModels} onSave={vi.fn()} />);

    expect(screen.getByLabelText(/analyze/i)).toHaveValue('gpt-4o');
    expect(screen.getByLabelText(/requirements/i)).toHaveValue('claude-opus-4');
    expect(screen.getByLabelText(/plan/i)).toHaveValue('gemini-pro');
    expect(screen.getByLabelText(/implement/i)).toHaveValue('gpt-4-turbo');
  });

  it('calls onSave with updated models when Save clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);

    render(<ModelSettingsSection models={defaultModels} onSave={onSave} />);

    const analyzeInput = screen.getByLabelText(/analyze/i);
    await user.clear(analyzeInput);
    await user.type(analyzeInput, 'gpt-4o');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        analyze: 'gpt-4o',
        requirements: 'claude-sonnet-4-5',
        plan: 'claude-sonnet-4-5',
        implement: 'claude-sonnet-4-5',
      })
    );
  });

  it('renders save button', () => {
    render(<ModelSettingsSection models={defaultModels} onSave={vi.fn()} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
