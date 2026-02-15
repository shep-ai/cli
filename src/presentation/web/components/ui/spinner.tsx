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
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const b = BORDER_WIDTH[size ?? 'md'];

  return (
    <div
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      className={cn(spinnerVariants({ size }), className)}
      style={{
        background: 'currentColor',
        WebkitMask: `repeating-conic-gradient(#0000 0deg,#000 1deg 70deg,#0000 71deg 90deg),
          radial-gradient(farthest-side,#0000 calc(100% - ${b} - 1px),#000 calc(100% - ${b}))`,
        WebkitMaskComposite: 'destination-in',
        maskComposite: 'intersect',
      }}
      {...props}
    />
  );
}

export { Spinner, spinnerVariants };
