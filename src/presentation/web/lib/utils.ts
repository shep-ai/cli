import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and merges Tailwind classes intelligently
 * with tailwind-merge to avoid conflicts.
 *
 * @example
 * cn('px-2 py-1', 'px-4') // Returns 'py-1 px-4' (px-4 wins)
 * cn('text-red-500', condition && 'text-blue-500') // Conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
