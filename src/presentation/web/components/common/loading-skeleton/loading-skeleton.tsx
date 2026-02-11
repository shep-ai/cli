import { cn } from '@/lib/utils';

const variantStyles = {
  line: 'h-4 w-full rounded-md',
  circle: 'size-12 rounded-full',
  card: 'h-32 w-full rounded-lg',
} as const;

interface LoadingSkeletonProps {
  variant?: keyof typeof variantStyles;
  width?: string;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({
  variant = 'line',
  width,
  height,
  className,
}: LoadingSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('bg-muted animate-pulse', variantStyles[variant], className)}
      style={{
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
    />
  );
}
