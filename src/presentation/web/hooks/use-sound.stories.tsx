import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { useSound, SOUND_NAMES, type SoundName } from './use-sound';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const CATEGORIES: Record<string, SoundName[]> = {
  'UI Actions': ['button', 'select', 'disabled'],
  Toggles: ['toggle_on', 'toggle_off'],
  Transitions: ['transition_up', 'transition_down'],
  Alerts: ['notification', 'caution', 'celebration'],
  Swipes: ['swipe', 'swipe_01', 'swipe_02', 'swipe_03', 'swipe_04', 'swipe_05'],
  Taps: ['tap_01', 'tap_02', 'tap_03', 'tap_04', 'tap_05'],
  Typing: ['type_01', 'type_02', 'type_03', 'type_04', 'type_05'],
  Loops: ['progress_loop', 'ringtone_loop'],
};

/* ------------------------------------------------------------------ */
/*  Single sound player (used per button)                             */
/* ------------------------------------------------------------------ */

function SoundButton({ name, volume }: { name: SoundName; volume: number }) {
  const isLoop = name.includes('loop');
  const { play, stop } = useSound(name, { volume, loop: isLoop });
  const [playing, setPlaying] = useState(false);

  const handleClick = () => {
    if (isLoop && playing) {
      stop();
      setPlaying(false);
    } else {
      play();
      setPlaying(true);
      if (!isLoop) {
        setTimeout(() => setPlaying(false), 2000);
      }
    }
  };

  return (
    <Button
      size="sm"
      variant={playing ? 'default' : 'outline'}
      onClick={handleClick}
      className="min-w-[120px] font-mono text-xs"
    >
      {isLoop && playing ? `Stop ${name}` : name}
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Full catalog demo                                                 */
/* ------------------------------------------------------------------ */

function SoundCatalog({ volume }: { volume: number }) {
  return (
    <div className="flex w-[560px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">Sound Library</h2>
        <p className="text-muted-foreground text-sm">
          {SOUND_NAMES.length} sounds available at{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">/sounds/*.wav</code>
        </p>
      </div>

      {Object.entries(CATEGORIES).map(([category, sounds]) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{category}</h3>
          <div className="flex flex-wrap gap-2">
            {sounds.map((name) => (
              <SoundButton key={name} name={name} volume={volume} />
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
  title: 'Hooks/useSound',
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    volume: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: 'Playback volume (0 to 1)',
      defaultValue: 0.5,
    },
  },
  args: {
    volume: 0.5,
  },
};

export default meta;
type Story = StoryObj<{ volume: number }>;

export const Catalog: Story = {
  render: ({ volume }) => <SoundCatalog volume={volume} />,
};
