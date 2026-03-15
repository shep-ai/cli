'use client';

import { useEffect, useState } from 'react';
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
  /** Additional CSS classes for the container. */
  className?: string;
}

/** Stagger delay between each item animation in ms. */
const STAGGER_MS = 50;

/** Total animation duration in ms. */
const DURATION_MS = 250;

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
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

  // Reversed actions so bottom-most item in stack = first action
  const reversedActions = [...actions].reverse();

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

      {/* FAB container */}
      <div
        data-testid="floating-action-button"
        className={cn('fixed right-6 bottom-6 z-50', className)}
      >
        {/* Action chips — vertical stack expanding upward */}
        <div
          className="absolute right-0 bottom-16 flex flex-col-reverse items-end gap-3"
          data-testid="fab-actions"
        >
          {reversedActions.map((action, reversedIndex) => {
            const originalIndex = actions.length - 1 - reversedIndex;
            // Stagger: bottom items appear first (closest to FAB)
            const openDelay = originalIndex * STAGGER_MS;
            // Close: top items disappear first
            const closeDelay = reversedIndex * STAGGER_MS;

            return (
              <button
                key={action.id}
                data-testid={`fab-action-${action.id}`}
                aria-label={action.label}
                disabled={action.disabled ?? action.loading}
                className={cn(
                  'flex items-center gap-3 rounded-full px-4 py-2.5',
                  'bg-background text-foreground shadow-lg',
                  'border-border border',
                  'transition-all ease-out',
                  'hover:bg-accent hover:text-accent-foreground',
                  'disabled:pointer-events-none disabled:opacity-50',
                  open
                    ? 'translate-y-0 scale-100 opacity-100'
                    : 'pointer-events-none translate-y-4 scale-95 opacity-0'
                )}
                style={{
                  transitionDuration: `${DURATION_MS}ms`,
                  transitionDelay: open ? `${openDelay}ms` : `${closeDelay}ms`,
                }}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {action.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : action.icon}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Primary FAB trigger */}
        <Button
          size="icon"
          data-testid="fab-trigger"
          aria-label={open ? 'Close actions' : 'Open actions'}
          className={cn(
            'relative h-12 w-12 rounded-full shadow-lg',
            'transition-colors duration-200'
          )}
          onClick={() => setOpen((prev) => !prev)}
        >
          {/* Plus icon — fades out when open */}
          <Plus
            className={cn(
              'absolute h-5 w-5 transition-all',
              open ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
            )}
            style={{ transitionDuration: `${DURATION_MS}ms` }}
          />
          {/* X icon — fades in when open */}
          <X
            className={cn(
              'absolute h-5 w-5 transition-all',
              open ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
            )}
            style={{ transitionDuration: `${DURATION_MS}ms` }}
          />
        </Button>
      </div>
    </>
  );
}
