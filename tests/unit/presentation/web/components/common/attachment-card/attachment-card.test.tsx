import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachmentCard } from '@/components/common/attachment-card';

describe('AttachmentCard', () => {
  it('renders filename and formatted size', () => {
    render(
      <AttachmentCard name="screenshot.png" size={150000} mimeType="image/png" onRemove={vi.fn()} />
    );
    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('146.5 KB')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(
      <AttachmentCard name="file.pdf" size={1024} mimeType="application/pdf" onRemove={onRemove} />
    );
    await user.click(screen.getByRole('button', { name: 'Remove file.pdf' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('shows spinner instead of remove button when loading', () => {
    render(
      <AttachmentCard
        name="uploading.png"
        size={0}
        mimeType="image/png"
        onRemove={vi.fn()}
        loading={true}
      />
    );
    expect(screen.queryByRole('button', { name: 'Remove uploading.png' })).not.toBeInTheDocument();
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });
});
