import * as React from 'react';

import { cn } from '@/lib/utils';

export interface OrbitingCirclesProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to reverse the orbit direction. */
  reverse?: boolean;
  /** Base duration in seconds for one full orbit. */
  duration?: number;
  /** Orbit radius in pixels. */
  radius?: number;
  /** Whether to render the circular orbit path. */
  path?: boolean;
  /** Size of each icon container in pixels. */
  iconSize?: number;
  /** Speed multiplier (higher = faster). */
  speed?: number;
}

function OrbitingCircles({
  className,
  children,
  reverse,
  duration = 20,
  radius = 160,
  path = true,
  iconSize = 30,
  speed = 1,
  ...props
}: OrbitingCirclesProps) {
  const calculatedDuration = duration / speed;
  return (
    <>
      {path ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <circle
            className="stroke-black/10 stroke-1 dark:stroke-white/10"
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
          />
        </svg>
      ) : null}
      {React.Children.map(children, (child, index) => {
        const angle = (360 / React.Children.count(children)) * index;
        return (
          <div
            style={
              {
                '--duration': calculatedDuration,
                '--radius': radius,
                '--angle': angle,
                '--icon-size': `${iconSize}px`,
              } as React.CSSProperties
            }
            className={cn(
              'animate-orbit absolute flex size-[var(--icon-size)] transform-gpu items-center justify-center rounded-full',
              { '[animation-direction:reverse]': reverse },
              className
            )}
            {...props}
          >
            {child}
          </div>
        );
      })}
    </>
  );
}

export { OrbitingCircles };
