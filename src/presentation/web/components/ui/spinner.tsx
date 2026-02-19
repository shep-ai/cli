import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spinner inline-block rounded-full', {
  variants: {
    size: {
      sm: 'size-4',
      md: 'size-6',
      lg: 'size-10',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const BORDER_WIDTH: Record<string, string> = {
  sm: '3px',
  md: '4px',
  lg: '8px',
};

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const b = BORDER_WIDTH[size ?? 'md'];

  return (
    <div
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
      style={{
        background: `conic-gradient(from 220deg, transparent 0%, currentColor 80%, transparent 100%)`,
        WebkitMask: `radial-gradient(farthest-side, #0000 calc(100% - ${b}), #000 calc(100% - ${b} + 1px))`,
      }}
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
