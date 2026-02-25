'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useSoundAction } from '@/hooks/use-sound-action';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const toggleOnSound = useSoundAction('toggle-on');
  const toggleOffSound = useSoundAction('toggle-off');

  const toggleTheme = () => {
    // Determine target theme before switching
    const currentResolved = theme === 'system' ? resolvedTheme : theme;
    const goingToDark = currentResolved !== 'dark';

    // Play sound before setTheme for immediate feedback
    if (goingToDark) {
      toggleOnSound.play();
    } else {
      toggleOffSound.play();
    }

    // If system theme, switch to explicit light/dark
    // If explicit, toggle between light and dark
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
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
