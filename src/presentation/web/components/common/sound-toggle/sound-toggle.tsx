'use client';

import { Volume2, VolumeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSoundEnabled } from '@/hooks/use-sound-enabled';

export function SoundToggle() {
  const { enabled, toggle } = useSoundEnabled();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={enabled ? 'Mute sounds' : 'Unmute sounds'}
    >
      {enabled ? <Volume2 className="h-5 w-5" /> : <VolumeOff className="h-5 w-5" />}
      <span className="sr-only">Toggle sound</span>
    </Button>
  );
}
