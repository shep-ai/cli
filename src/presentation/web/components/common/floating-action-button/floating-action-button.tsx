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

      {/* FAB container — horizontal: + left, chat right */}
      <div
        data-testid="floating-action-button"
        className={cn('fixed right-6 bottom-6 z-50', className)}
      >
        {/* Action chips — expand upward from the + button */}
        <div
          className={cn(
            'absolute right-[calc(100%+12px)] bottom-0 flex flex-col items-end gap-2',
            !open && 'pointer-events-none'
          )}
          data-testid="fab-actions"
        >
          {actions.map((action, i) => {
            const openDelay = (actions.length - 1 - i) * STAGGER_MS;
            const closeDelay = i * STAGGER_MS;

            return (
              <button
                key={action.id}
                data-testid={`fab-action-${action.id}`}
                aria-label={action.label}
                disabled={action.disabled ?? action.loading}
                className={cn(
                  'flex h-12 w-52 items-center justify-center gap-3 rounded-full px-4',
                  'bg-background text-foreground shadow-sm',
                  'border-border border',
                  'hover:bg-accent hover:text-accent-foreground',
                  'disabled:pointer-events-none disabled:opacity-50',
                  open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-0 opacity-0'
                )}
                style={{
                  transition: `opacity ${open ? DURATION_MS : 150}ms ease-out ${open ? openDelay : closeDelay}ms`,
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

        {/* FAB trigger */}
        <div className="flex items-center">
          <Button
            size="icon"
            data-testid="fab-trigger"
            aria-label={open ? 'Close actions' : 'Open actions'}
            className={cn(
              'relative h-14 w-14 rounded-full shadow-lg',
              'bg-indigo-500 text-white hover:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400',
              'transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95'
            )}
            onClick={() => setOpen((prev) => !prev)}
          >
            <Plus
              className={cn(
                'absolute h-8 w-8 stroke-[2.5] transition-all',
                open ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
              )}
              style={{ transitionDuration: `${DURATION_MS}ms` }}
            />
            <X
              className={cn(
                'absolute h-8 w-8 stroke-[2.5] transition-all',
                open ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
              )}
              style={{ transitionDuration: `${DURATION_MS}ms` }}
            />
          </Button>
        </div>
      </div>
    </>
  );
}
