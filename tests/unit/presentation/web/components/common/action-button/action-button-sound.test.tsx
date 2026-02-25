import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Code2 } from 'lucide-react';
import { ActionButton } from '@/components/common/action-button';

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockClickPlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'click') return { play: mockClickPlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

describe('ActionButton — sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays click sound when button is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <ActionButton
        label="Open in IDE"
        onClick={onClick}
        loading={false}
        error={false}
        icon={Code2}
      />
    );

    await user.click(screen.getByRole('button', { name: /open in ide/i }));

    expect(mockClickPlay).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not play sound when button is disabled (loading)', async () => {
    const onClick = vi.fn();

    render(
      <ActionButton
        label="Open in IDE"
        onClick={onClick}
        loading={true}
        error={false}
        icon={Code2}
      />
    );

    const button = screen.getByRole('button', { name: /open in ide/i });
    expect(button).toBeDisabled();
    expect(mockClickPlay).not.toHaveBeenCalled();
  });
});
