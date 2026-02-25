import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { useSoundAction, SOUND_ACTION_MAP, type SoundAction } from './use-sound-action';

/* ------------------------------------------------------------------ */
/*  Action categories for display grouping                            */
/* ------------------------------------------------------------------ */

const ACTION_CATEGORIES: Record<string, SoundAction[]> = {
  'Navigation (0.2)': ['navigate', 'menu-item'],
  'Toggles & Selections (0.3)': [
    'select',
    'toggle-on',
    'toggle-off',
    'click',
    'cancel',
    'expand',
    'collapse',
    'menu-open',
    'copy',
  ],
  'Drawers & Transitions (0.4)': ['drawer-open', 'drawer-close', 'submit'],
  'Significant Actions (0.5)': ['approve', 'reject', 'create', 'delete'],
  'Notifications (0.5)': [
    'notification-success',
    'notification-error',
    'notification-warning',
    'notification-info',
  ],
};

/* ------------------------------------------------------------------ */
/*  Single action button                                              */
/* ------------------------------------------------------------------ */

function ActionSoundButton({ action }: { action: SoundAction }) {
  const { play } = useSoundAction(action);
  const [playing, setPlaying] = useState(false);
  const entry = SOUND_ACTION_MAP[action];

  const handleClick = () => {
    play();
    setPlaying(true);
    setTimeout(() => setPlaying(false), 600);
  };

  return (
    <Button
      size="sm"
      variant={playing ? 'default' : 'outline'}
      onClick={handleClick}
      className="min-w-[160px] font-mono text-xs"
    >
      {action}
      <span className="text-muted-foreground ml-1 text-[10px]">
        ({entry.sound} @ {entry.volume})
      </span>
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Full catalog                                                      */
/* ------------------------------------------------------------------ */

function SoundActionCatalog() {
  return (
    <div className="flex w-[640px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Sound Action Map</h2>
        <p className="text-muted-foreground text-sm">
          {Object.keys(SOUND_ACTION_MAP).length} semantic actions mapped to sounds. Volume
          hierarchy: navigation (0.2) → toggles (0.3) → drawers (0.4) → actions (0.5).
        </p>
      </div>

      {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <ActionSoundButton key={action} action={action} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Storybook meta                                                    */
/* ------------------------------------------------------------------ */

const meta: Meta = {
  title: 'Hooks/useSoundAction',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Catalog: Story = {
  render: () => <SoundActionCatalog />,
};
