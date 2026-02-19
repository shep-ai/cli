'use client';

import type { LucideIcon } from 'lucide-react';
import { Loader2, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ActionButtonProps {
  label: string;
  onClick: () => void;
  loading: boolean;
  error: boolean;
  icon: LucideIcon;
  /** When true, omits label text — label is still used as aria-label. */
  iconOnly?: boolean;
  /** Button variant. @default 'outline' */
  variant?: 'outline' | 'ghost' | 'default' | 'destructive' | 'secondary' | 'link';
  /** Button size. @default 'sm' */
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
}

export function ActionButton({
  label,
  onClick,
  loading,
  error,
  icon: Icon,
  iconOnly = false,
  variant = 'outline',
  size = 'sm',
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      aria-label={label}
      disabled={loading}
      onClick={onClick}
      className={cn(
        'gap-1.5',
        error && 'text-destructive hover:text-destructive',
        !error &&
          iconOnly &&
          variant === 'ghost' &&
          'text-muted-foreground cursor-pointer rounded-full transition-colors hover:text-blue-500'
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : error ? (
        <CircleAlert className="size-4" />
      ) : (
        <Icon className="size-4" />
      )}
      {iconOnly ? null : label}
    </Button>
  );
}
