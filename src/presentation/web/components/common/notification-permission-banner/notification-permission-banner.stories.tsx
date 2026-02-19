import type { Meta, StoryObj } from '@storybook/react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function noop() {
  // story placeholder
}

const meta: Meta = {
  title: 'Composed/NotificationPermissionBanner',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Static render of the banner since the real component depends on the
 * browser Notification API which is unavailable in Storybook.
 */
function BannerPreview() {
  return (
    <div className="bg-muted/30 relative h-64 w-full rounded-lg border">
      <div className="bg-background absolute bottom-4 left-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border p-3 shadow-lg">
        <Bell className="text-muted-foreground size-5 shrink-0" />
        <p className="text-muted-foreground text-sm">
          Enable desktop notifications to stay updated on feature progress.
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" onClick={noop}>
            Enable
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={noop}
            aria-label="Dismiss notification banner"
          >
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <BannerPreview />,
};
