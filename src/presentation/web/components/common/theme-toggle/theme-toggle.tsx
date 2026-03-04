'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useSoundAction } from '@/hooks/use-sound-action';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const toggleOnSound = useSoundAction('toggle-on');
  const toggleOffSound = useSoundAction('toggle-off');

  const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
    const currentResolved = theme === 'system' ? resolvedTheme : theme;
    const goingToDark = currentResolved !== 'dark';
    const newTheme =
      theme === 'system'
        ? resolvedTheme === 'dark'
          ? 'light'
          : 'dark'
        : theme === 'dark'
          ? 'light'
          : 'dark';

    // Play sound before transition for immediate feedback
    if (goingToDark) {
      toggleOnSound.play();
    } else {
      toggleOffSound.play();
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(document as any).startViewTransition || prefersReducedMotion) {
      setTheme(newTheme);
      return;
    }

    document.documentElement.style.setProperty('--x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--y', `${e.clientY}px`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).startViewTransition(() => {
      setTheme(newTheme);
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun className="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
