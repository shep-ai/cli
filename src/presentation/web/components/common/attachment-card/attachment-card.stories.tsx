import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AttachmentCard } from './attachment-card';

const meta: Meta<typeof AttachmentCard> = {
  title: 'Common/AttachmentCard',
  component: AttachmentCard,
  tags: ['autodocs'],
  args: {
    onRemove: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AttachmentCard>;

export const ImageFile: Story = {
  args: {
    name: 'screenshot.png',
    size: 150000,
    mimeType: 'image/png',
  },
};

export const PdfFile: Story = {
  args: {
    name: 'requirements.pdf',
    size: 42000,
    mimeType: 'application/pdf',
  },
};

export const CodeFile: Story = {
  args: {
    name: 'index.ts',
    size: 1024,
    mimeType: 'text/typescript',
  },
};

export const UnknownFile: Story = {
  args: {
    name: 'data.bin',
    size: 8192,
    mimeType: 'application/octet-stream',
  },
};

export const Loading: Story = {
  args: {
    name: 'uploading-image.png',
    size: 0,
    mimeType: 'image/png',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    name: 'screenshot.png',
    size: 150000,
    mimeType: 'image/png',
    disabled: true,
  },
};
