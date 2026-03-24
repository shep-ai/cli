'use client';

import { useState, useCallback } from 'react';
import { MessageSquare, X, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChatTab } from './ChatTab';

// ── Persistent global chat popup ──────────────────────────────────────────

export function GlobalChatPopup() {
  const [isOpen, setIsOpen] = useState(false);
  // Keep panel mounted after first open so chat state persists
  const [hasOpened, setHasOpened] = useState(false);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setHasOpened(true);
      return !prev;
    });
  }, []);

  return (
    <>
      {/* Chat panel — always mounted after first open, animated via CSS */}
      {hasOpened ? (
        <div
          className={cn(
            'fixed bottom-24 left-[calc(var(--sidebar-width)+1rem)] z-[60] flex flex-col overflow-hidden rounded-2xl shadow-xl',
            'ring-[3px] ring-violet-500/25 dark:ring-violet-400/20',
            'bg-background/80 backdrop-blur-xl dark:bg-neutral-900/80',
            'h-[70vh] w-[520px]',
            'origin-bottom-left transition-all duration-300 ease-out',
            isOpen
              ? 'pointer-events-auto scale-100 opacity-100'
              : 'pointer-events-none scale-95 opacity-0'
          )}
        >
          {/* Header — layered depth, no garish color */}
          <div className="relative flex h-11 shrink-0 items-center gap-2.5 border-b border-black/[0.06] px-3.5 dark:border-white/[0.06]">
            {/* Subtle gradient wash — barely visible, adds depth */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-foreground/[0.02] via-transparent to-foreground/[0.02]" />
            <div className="relative flex h-5 w-5 items-center justify-center">
              <Bot className="text-foreground/50 h-4 w-4" />
            </div>
            <div className="relative flex items-baseline gap-2">
              <span className="text-foreground/90 text-base font-bold tracking-tight">Shep</span>
              <span className="text-foreground/30 text-xs font-medium tracking-widest uppercase">global</span>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="text-foreground/30 hover:text-foreground/60 relative ml-auto rounded-md p-1 transition-colors"
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Chat content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ChatTab featureId="global" />
          </div>
        </div>
      ) : null}

      {/* Floating chat button — always visible, icon crossfades */}
      <div className="fixed bottom-6 left-[calc(var(--sidebar-width)+1rem)] z-[60]">
        <Button
          size="icon"
          onClick={toggle}
          title="Shep Chat"
          className={cn(
            'relative h-14 w-14 rounded-full shadow-lg',
            'transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95',
            isOpen
              ? 'bg-violet-600 text-white hover:bg-violet-500'
              : 'bg-violet-500 text-white hover:bg-violet-400 dark:bg-violet-500 dark:hover:bg-violet-400'
          )}
        >
          <MessageSquare
            className={cn(
              'absolute h-7 w-7 stroke-[2.5] transition-all duration-200',
              isOpen ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
            )}
          />
          <X
            className={cn(
              'absolute h-6 w-6 stroke-[2.5] transition-all duration-200',
              isOpen ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
            )}
          />
        </Button>
      </div>
    </>
  );
}
