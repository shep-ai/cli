'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface FloatingActionButtonAction {
  /** Unique key for the action. */
  id: string;
  /** Accessible label shown next to the icon. */
  label: string;
  /** Lucide icon component. */
  icon: React.ReactNode;
  /** Called when the action is clicked. */
  onClick: () => void;
  /** Whether the action is currently loading. */
  loading?: boolean;
  /** Whether the action is disabled. */
  disabled?: boolean;
}

export interface FloatingActionButtonProps {
  /** Action items shown when the FAB is expanded. */
  actions: FloatingActionButtonAction[];
  /** Additional CSS classes for the wrapper. */
  className?: string;
  /** Inline styles for the wrapper (e.g. dynamic positioning). */
  style?: React.CSSProperties;
}

/** Stagger delay between each item animation in ms. */
const STAGGER_MS = 50;

/** Total animation duration in ms. */
const DURATION_MS = 250;

/**
 * (+) FAB with expandable action menu.
 * Renders inline — parent controls positioning.
 */
export function FloatingActionButton({ actions, className, style }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Invisible click-outside catcher */}
      {open ? (
        <div
          data-testid="fab-overlay"
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div
        data-testid="floating-action-button"
        className={cn('relative z-50', className)}
        style={style}
      >
        {/* Action chips — expand upward */}
        <div
          className={cn(
            'absolute bottom-[calc(100%+24px)] left-0 flex flex-col items-start gap-2',
            !open && 'pointer-events-none'
          )}
          data-testid="fab-actions"
        >
          {actions.map((action, i) => {
            const openDelay = (actions.length - 1 - i) * STAGGER_MS;

            return (
              <button
                key={action.id}
                data-testid={`fab-action-${action.id}`}
                aria-label={action.label}
                disabled={action.disabled ?? action.loading}
                className={cn(
                  'flex h-10 items-center gap-2.5 rounded-full px-4',
                  'bg-background text-foreground shadow-md',
                  'border-border border',
                  'hover:bg-accent hover:text-accent-foreground',
                  'disabled:pointer-events-none disabled:opacity-50',
                  'text-sm font-medium whitespace-nowrap',
                  open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-0 opacity-0'
                )}
                style={{
                  transition: `opacity ${open ? DURATION_MS : 120}ms ease-out ${open ? openDelay : 0}ms, transform ${open ? DURATION_MS : 120}ms ease-out ${open ? openDelay : 0}ms`,
                }}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {action.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
                </span>
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAB trigger */}
        <Button
          size="icon"
          data-testid="fab-trigger"
          aria-label={open ? 'Close actions' : 'Create new'}
          className={cn(
            'relative h-14 w-14 rounded-full shadow-lg',
            'bg-indigo-500 text-white hover:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400',
            'transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95'
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Plus
            className={cn(
              'absolute h-7 w-7 stroke-[2.5] transition-all',
              open ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
            )}
            style={{ transitionDuration: `${DURATION_MS}ms` }}
          />
          <X
            className={cn(
              'absolute h-6 w-6 stroke-[2.5] transition-all',
              open ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
            )}
            style={{ transitionDuration: `${DURATION_MS}ms` }}
          />
        </Button>
      </div>
    </>
  );
}
