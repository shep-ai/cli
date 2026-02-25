import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileSection } from '@/components/features/settings/user-profile-section';
import type { UserProfile } from '@shepai/core/domain/generated/output';

const defaultData: UserProfile = {};

function renderSection(
  overrides: { data?: UserProfile; onSave?: (data: UserProfile) => Promise<boolean> } = {}
) {
  const props = {
    data: overrides.data ?? defaultData,
    onSave: overrides.onSave ?? vi.fn().mockResolvedValue(true),
  };
  return render(<UserProfileSection {...props} />);
}

describe('UserProfileSection', () => {
  it('renders 3 user profile fields', () => {
    renderSection();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub Username')).toBeInTheDocument();
  });

  it('initializes with prop values', () => {
    renderSection({
      data: { name: 'Jane Doe', email: 'jane@example.com', githubUsername: 'janedoe' },
    });
    expect(screen.getByLabelText('Name')).toHaveValue('Jane Doe');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('GitHub Username')).toHaveValue('janedoe');
  });

  it('initializes with empty values when data is empty', () => {
    renderSection({ data: {} });
    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('GitHub Username')).toHaveValue('');
  });

  it('calls onSave with updated profile', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(true);
    renderSection({ onSave });

    await user.type(screen.getByLabelText('Name'), 'John');
    await user.type(screen.getByLabelText('Email'), 'john@test.com');
    await user.type(screen.getByLabelText('GitHub Username'), 'johnd');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@test.com',
      githubUsername: 'johnd',
    });
  });

  it('renders a save button', () => {
    renderSection();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('uses email input type for email field', () => {
    renderSection();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
  });
});
