'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DrawerRevisionInputProps } from './drawer-revision-input-config';

export function DrawerRevisionInput({
  onSubmit,
  placeholder = 'Ask AI to revise...',
  ariaLabel,
  disabled = false,
}: DrawerRevisionInputProps) {
  const [chatInput, setChatInput] = useState('');

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    onSubmit(text);
    setChatInput('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
      <Input
        type="text"
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        disabled={disabled}
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        className="flex-1"
      />
      <Button type="submit" variant="secondary" size="icon" aria-label="Send" disabled={disabled}>
        <Send />
      </Button>
    </form>
  );
}
