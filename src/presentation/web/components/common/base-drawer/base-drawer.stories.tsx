import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { BaseDrawer } from './base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof BaseDrawer> = {
  title: 'Drawers/Base/BaseDrawer',
  component: BaseDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof BaseDrawer>;

/* ---------------------------------------------------------------------------
 * Trigger wrapper — starts closed, click to open
 * ------------------------------------------------------------------------- */

function DrawerTrigger(props: Omit<React.ComponentProps<typeof BaseDrawer>, 'open' | 'onClose'>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open Drawer
      </Button>
      <BaseDrawer {...props} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default drawer with sm size, non-modal, children only. */
export const Default: Story = {
  render: () => (
    <DrawerTrigger>
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Default drawer content</p>
      </div>
    </DrawerTrigger>
  ),
};

/** Explicit sm size with inspector-style content. */
export const SmallSize: Story = {
  render: () => (
    <DrawerTrigger size="sm">
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold">Feature Inspector</h3>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">Status</span>
          <span className="text-sm">Running</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs">Progress</span>
          <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full w-[45%] rounded-full" />
          </div>
        </div>
      </div>
    </DrawerTrigger>
  ),
};

/** Medium size with content-rich review-style content. */
export const MediumSize: Story = {
  render: () => (
    <DrawerTrigger size="md">
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-sm font-semibold">Review Content</h3>
        <p className="text-muted-foreground text-sm">
          This drawer uses size=&quot;md&quot; (w-xl / 576px) for content-rich review panels that
          need more horizontal space for diff summaries, tables, and code blocks.
        </p>
        <div className="bg-muted rounded-md p-3">
          <pre className="text-xs">
            {`+ Added authentication middleware\n- Removed legacy session handler\n  Updated user model schema`}
          </pre>
        </div>
      </div>
    </DrawerTrigger>
  ),
};

/** Modal drawer with overlay. */
export const Modal: Story = {
  render: () => (
    <DrawerTrigger modal>
      <div className="p-4">
        <p className="text-muted-foreground text-sm">
          This drawer is modal — an overlay blocks background interaction and focus is trapped.
        </p>
      </div>
    </DrawerTrigger>
  ),
};

/** Drawer with header slot containing DrawerTitle and DrawerDescription. */
export const WithHeader: Story = {
  render: () => (
    <DrawerTrigger
      header={
        <>
          <DrawerTitle>Feature Details</DrawerTitle>
          <DrawerDescription>FEAT-042 — Authentication Flow</DrawerDescription>
        </>
      }
    >
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Content below the header.</p>
      </div>
    </DrawerTrigger>
  ),
};

/** Drawer with footer slot containing action buttons. */
export const WithFooter: Story = {
  render: () => (
    <DrawerTrigger
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button className="flex-1">Save</Button>
        </div>
      }
    >
      <div className="p-4">
        <p className="text-muted-foreground text-sm">Content above the footer.</p>
      </div>
    </DrawerTrigger>
  ),
};

/** Drawer with both header and footer slots populated. */
export const WithHeaderAndFooter: Story = {
  render: () => (
    <DrawerTrigger
      header={
        <>
          <DrawerTitle>Create Feature</DrawerTitle>
          <DrawerDescription>Fill in the details below</DrawerDescription>
        </>
      }
      footer={
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button className="flex-1">Create</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Name</label>
          <input
            type="text"
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            placeholder="Feature name"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="border-input bg-background rounded-md border px-3 py-2 text-sm"
            rows={3}
            placeholder="Optional description"
          />
        </div>
      </div>
    </DrawerTrigger>
  ),
};

/** Drawer with deployTarget prop showing the dev server bar below the header. */
export const WithDevServerBar: Story = {
  render: () => (
    <DrawerTrigger
      header={
        <>
          <DrawerTitle>Auth Module</DrawerTitle>
          <DrawerDescription>#f-001</DrawerDescription>
        </>
      }
      deployTarget={{
        targetId: '#f-001',
        targetType: 'feature',
        repositoryPath: '/Users/dev/my-project',
        branch: 'feat/auth-module',
      }}
    >
      <div className="p-4">
        <p className="text-muted-foreground text-sm">
          The deploy bar appears between the header and this content.
        </p>
      </div>
    </DrawerTrigger>
  ),
};

/**
 * Drawer with content that exceeds viewport to demonstrate scroll behavior.
 *
 * **Fixed Header/Footer Layout:**
 * - The header (DrawerTitle + DrawerDescription) remains fixed at the top while scrolling
 * - A Separator is automatically rendered below the header — no need to add one manually
 * - The footer (if present, e.g., DrawerActionBar) remains fixed at the bottom while scrolling
 * - Only the content area (children) scrolls when drawer content exceeds available height
 *
 * **Spacing Conventions:**
 * - Content consumers should add `p-4` padding for consistent spacing (as shown in this example)
 * - Footer components like DrawerActionBar should use `border-t` for visual separation
 *
 * Try scrolling the content below to see the fixed header behavior.
 */
export const ScrollableContent: Story = {
  render: () => (
    <DrawerTrigger
      header={
        <>
          <DrawerTitle>Scrollable Content</DrawerTitle>
          <DrawerDescription>Content below overflows and scrolls</DrawerDescription>
        </>
      }
    >
      <div className="flex flex-col gap-4 overflow-y-auto p-4">
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="border-border rounded-md border p-3">
            <h4 className="text-sm font-medium">Item {i + 1}</h4>
            <p className="text-muted-foreground text-xs">
              This is a scrollable content item to demonstrate overflow handling.
            </p>
          </div>
        ))}
      </div>
    </DrawerTrigger>
  ),
};
