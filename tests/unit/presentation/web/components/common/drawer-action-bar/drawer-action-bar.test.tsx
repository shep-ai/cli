import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockApprovePlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'approve') return { play: mockApprovePlay, stop: vi.fn(), isPlaying: false };
    return { play: vi.fn(), stop: vi.fn(), isPlaying: false };
  }),
}));

describe('DrawerActionBar — sound effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays approve sound when approve button is clicked', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<DrawerActionBar onApprove={onApprove} approveLabel="Approve" />);

    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(mockApprovePlay).toHaveBeenCalledOnce();
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it('calls onReject when revision is submitted via chat input', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<DrawerActionBar onApprove={vi.fn()} approveLabel="Approve" onReject={onReject} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'please revise this');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(onReject).toHaveBeenCalledWith('please revise this');
  });

  it('disables all controls when isProcessing is true', () => {
    render(
      <DrawerActionBar
        onApprove={vi.fn()}
        approveLabel="Approve"
        onReject={vi.fn()}
        isProcessing={true}
      />
    );

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /approve/i })).toBeDisabled();
    expect(mockApprovePlay).not.toHaveBeenCalled();
  });
});
