import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  InlineAttachments,
  parseAttachmentRefs,
} from '@/components/common/inline-attachments/inline-attachments';

describe('parseAttachmentRefs', () => {
  it('returns single text segment for plain text without references', () => {
    const result = parseAttachmentRefs('Just some plain text');
    expect(result).toEqual([{ type: 'text', value: 'Just some plain text' }]);
  });

  it('parses a single attachment reference', () => {
    const result = parseAttachmentRefs(
      'See screenshot:\n@/home/user/.shep/attachments/pending-abc/image.png'
    );
    expect(result).toEqual([
      { type: 'text', value: 'See screenshot:\n' },
      { type: 'attachment', path: '/home/user/.shep/attachments/pending-abc/image.png' },
    ]);
  });

  it('parses multiple attachment references', () => {
    const result = parseAttachmentRefs('Before: @/path/before.png After: @/path/after.png');
    expect(result).toHaveLength(4);
    expect(result[1]).toEqual({ type: 'attachment', path: '/path/before.png' });
    expect(result[3]).toEqual({ type: 'attachment', path: '/path/after.png' });
  });

  it('handles attachment reference at start of text', () => {
    const result = parseAttachmentRefs('@/path/image.png some text after');
    expect(result[0]).toEqual({ type: 'attachment', path: '/path/image.png' });
    expect(result[1]).toEqual({ type: 'text', value: ' some text after' });
  });

  it('returns empty array for empty string', () => {
    const result = parseAttachmentRefs('');
    expect(result).toEqual([]);
  });
});

describe('InlineAttachments', () => {
  it('renders plain text when no attachment references present', () => {
    render(<InlineAttachments text="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('does not render attachment elements for plain text', () => {
    render(<InlineAttachments text="No attachments here" />);
    expect(screen.queryByTestId('inline-attachment-image')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inline-attachment-file')).not.toBeInTheDocument();
  });

  it('renders inline image for image attachment reference', () => {
    render(
      <InlineAttachments text="See: @/home/user/.shep/attachments/pending-abc/screenshot.png" />
    );
    const img = screen.getByTestId('inline-attachment-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'screenshot.png');
  });

  it('renders file link for non-image attachment reference', () => {
    render(<InlineAttachments text="Log: @/home/user/.shep/attachments/pending-abc/error.log" />);
    const link = screen.getByTestId('inline-attachment-file');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('error.log');
  });

  it('renders extra attachment paths passed via prop', () => {
    render(
      <InlineAttachments
        text="Please fix this"
        attachmentPaths={['/home/user/.shep/attachments/pending-abc/fix.png']}
      />
    );
    const img = screen.getByTestId('inline-attachment-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'fix.png');
  });

  it('renders both inline references and extra paths', () => {
    render(
      <InlineAttachments text="Issue: @/path/inline.png" attachmentPaths={['/path/extra.png']} />
    );
    const images = screen.getAllByTestId('inline-attachment-image');
    expect(images).toHaveLength(2);
  });

  it('renders text segments alongside attachment references', () => {
    render(<InlineAttachments text="Before the image @/path/screenshot.png after the image" />);
    expect(screen.getByText('Before the image')).toBeInTheDocument();
    expect(screen.getByText('after the image')).toBeInTheDocument();
    expect(screen.getByTestId('inline-attachment-image')).toBeInTheDocument();
  });
});
