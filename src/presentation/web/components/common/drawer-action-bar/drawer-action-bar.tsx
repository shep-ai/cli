'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSoundAction } from '@/hooks/use-sound-action';
import type { DrawerActionBarProps } from './drawer-action-bar-config';

export function DrawerActionBar({
  onReject,
  onApprove,
  approveLabel,
  approveIcon,
  revisionPlaceholder,
  isProcessing = false,
  isRejecting = false,
  children,
}: DrawerActionBarProps) {
  const [chatInput, setChatInput] = useState('');
  const approveSound = useSoundAction('approve');
  const disabled = isProcessing || isRejecting;

  function handleRevisionSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !onReject) return;
    onReject(text);
    setChatInput('');
  }

  return (
    <div className="border-border shrink-0 border-t">
      {children}
      {onReject ? (
        <form onSubmit={handleRevisionSubmit} className="flex items-center gap-2 p-4">
          <Input
            type="text"
            placeholder={revisionPlaceholder ?? 'Ask AI to revise...'}
            aria-label={revisionPlaceholder ?? 'Ask AI to revise...'}
            disabled={disabled}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            aria-label="Send"
            disabled={disabled}
          >
            <Send />
          </Button>
          <Button
            type="button"
            disabled={disabled}
            onClick={() => {
              approveSound.play();
              onApprove();
            }}
          >
            {approveIcon}
            {approveLabel}
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 px-4 pb-4">
          <Button
            type="button"
            className="flex-1"
            disabled={disabled}
            onClick={() => {
              approveSound.play();
              onApprove();
            }}
          >
            {approveIcon}
            {approveLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
