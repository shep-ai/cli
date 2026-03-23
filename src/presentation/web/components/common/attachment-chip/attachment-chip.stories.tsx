import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AttachmentChip } from './attachment-chip';

const meta: Meta<typeof AttachmentChip> = {
  title: 'Common/AttachmentChip',
  component: AttachmentChip,
  tags: ['autodocs'],
  args: {
    onRemove: fn(),
    onNotesChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AttachmentChip>;

export const ImageFile: Story = {
  args: {
    name: 'screenshot.png',
    size: 150000,
    mimeType: 'image/png',
    path: '/tmp/test/screenshot.png',
  },
};

export const ImageFileWithNotes: Story = {
  args: {
    name: 'dashboard.png',
    size: 250000,
    mimeType: 'image/png',
    path: '/tmp/test/dashboard.png',
    notes: 'This shows the main dashboard layout with the sidebar collapsed.',
  },
};

export const PdfFile: Story = {
  args: {
    name: 'requirements.pdf',
    size: 42000,
    mimeType: 'application/pdf',
    path: '/tmp/test/requirements.pdf',
  },
};

export const CodeFile: Story = {
  args: {
    name: 'index.ts',
    size: 1024,
    mimeType: 'text/typescript',
    path: '/tmp/test/index.ts',
  },
};

export const Loading: Story = {
  args: {
    name: 'uploading-image.png',
    size: 0,
    mimeType: 'image/png',
    path: '',
    loading: true,
  },
};
