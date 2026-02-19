import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const cometSpinnerVariants = cva('inline-block shrink-0', {
  variants: {
    size: {
      sm: 'size-5',
      md: 'size-8',
      lg: 'size-12',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface CometSpinnerProps
  extends React.SVGAttributes<SVGSVGElement>, VariantProps<typeof cometSpinnerVariants> {
  /** Duration in seconds for the outer rotation. */
  duration?: number;
}

const PARTICLES = [
  { r: 9, spline: '0.12 0 0.04 1', opacity: 1 },
  { r: 8.2, spline: '0.16 0 0.08 1', opacity: 0.95 },
  { r: 7.4, spline: '0.20 0 0.12 1', opacity: 0.9 },
  { r: 6.6, spline: '0.25 0 0.16 1', opacity: 0.84 },
  { r: 5.8, spline: '0.30 0 0.20 1', opacity: 0.76 },
  { r: 5, spline: '0.36 0 0.25 1', opacity: 0.67 },
  { r: 4.2, spline: '0.42 0 0.31 1', opacity: 0.56 },
  { r: 3.4, spline: '0.48 0 0.37 1', opacity: 0.44 },
  { r: 2.6, spline: '0.55 0 0.44 1', opacity: 0.32 },
  { r: 1.8, spline: '0.62 0 0.52 1', opacity: 0.2 },
  { r: 1, spline: '0.70 0 0.60 1', opacity: 0.1 },
];

function CometSpinner({ className, size = 'md', duration = 5, ...props }: CometSpinnerProps) {
  return (
    <svg
      data-slot="comet-spinner"
      role="status"
      aria-label="Loading"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={cn(cometSpinnerVariants({ size }), className)}
      {...props}
    >
      <defs>
        <filter
          id="comet-gooey"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          <feColorMatrix
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 50 -30"
            result="goo"
          />
        </filter>
      </defs>

      <g filter="url(#comet-gooey)">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 50 50"
          to="360 50 50"
          dur={`${duration}s`}
          repeatCount="indefinite"
        />

        {PARTICLES.map((p) => (
          <g key={p.r}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              calcMode="spline"
              values="0 50 50;360 50 50"
              keyTimes="0;1"
              keySplines={p.spline}
              dur="1s"
              repeatCount="indefinite"
            />
            <circle cx="50" cy="18" r={p.r} fill="currentColor" opacity={p.opacity} />
          </g>
        ))}

        <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.15">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
          <animate
            attributeName="opacity"
            values="0.1;0.25;0.1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </svg>
  );
}

export { CometSpinner, cometSpinnerVariants };
