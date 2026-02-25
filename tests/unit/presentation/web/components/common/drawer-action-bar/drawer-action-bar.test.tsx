import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';

/* ------------------------------------------------------------------ */
/*  Mock useSoundAction                                                */
/* ------------------------------------------------------------------ */

const mockApprovePlay = vi.fn();
const mockRejectPlay = vi.fn();

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn((action: string) => {
    if (action === 'approve') return { play: mockApprovePlay, stop: vi.fn(), isPlaying: false };
    if (action === 'reject') return { play: mockRejectPlay, stop: vi.fn(), isPlaying: false };
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

  it('plays reject sound when reject button is clicked', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<DrawerActionBar onApprove={vi.fn()} approveLabel="Approve" onReject={onReject} />);

    await user.click(screen.getByRole('button', { name: /^reject$/i }));

    expect(mockRejectPlay).toHaveBeenCalledOnce();
  });

  it('does not play sounds when buttons are disabled', () => {
    render(
      <DrawerActionBar
        onApprove={vi.fn()}
        approveLabel="Approve"
        onReject={vi.fn()}
        isProcessing={true}
      />
    );

    const approveBtn = screen.getByRole('button', { name: /approve/i });
    const rejectBtn = screen.getByRole('button', { name: /^reject$/i });

    expect(approveBtn).toBeDisabled();
    expect(rejectBtn).toBeDisabled();
    expect(mockApprovePlay).not.toHaveBeenCalled();
    expect(mockRejectPlay).not.toHaveBeenCalled();
  });
});
