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

describe('DrawerActionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('plays approve sound when approve button is clicked (no onReject)', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    render(<DrawerActionBar onApprove={onApprove} approveLabel="Approve" />);

    await user.click(screen.getByRole('button', { name: /approve/i }));

    expect(mockApprovePlay).toHaveBeenCalledOnce();
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it('calls onReject when revision is submitted via submit button', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(<DrawerActionBar onApprove={vi.fn()} approveLabel="Approve" onReject={onReject} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'please revise this');
    await user.click(screen.getByTestId('drawer-action-submit'));

    expect(onReject).toHaveBeenCalledWith('please revise this', []);
  });

  it('limits textarea height to 35dvh to prevent unbounded growth', () => {
    render(<DrawerActionBar onApprove={vi.fn()} approveLabel="Approve" onReject={vi.fn()} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('max-h-[35dvh]');
    expect(textarea.className).toContain('overflow-y-auto');
  });

  it('approves by default when chat input is empty', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<DrawerActionBar onApprove={onApprove} approveLabel="Approve" onReject={onReject} />);

    await user.click(screen.getByTestId('drawer-action-submit'));

    expect(mockApprovePlay).toHaveBeenCalledOnce();
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).not.toHaveBeenCalled();
  });

  it('rejects when chat input has text and submit is clicked', async () => {
    const user = userEvent.setup();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<DrawerActionBar onApprove={onApprove} approveLabel="Approve" onReject={onReject} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'needs changes');
    await user.click(screen.getByTestId('drawer-action-submit'));

    expect(onReject).toHaveBeenCalledWith('needs changes', []);
    expect(onApprove).not.toHaveBeenCalled();
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
    expect(screen.getByTestId('drawer-action-submit')).toBeDisabled();
    // Single button — approve is now part of drawer-action-submit
    expect(mockApprovePlay).not.toHaveBeenCalled();
  });
});
