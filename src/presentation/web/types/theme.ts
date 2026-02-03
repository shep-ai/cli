/**
 * Theme type definitions for the Shep AI Web UI
 */

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

export const THEME_STORAGE_KEY = 'shep-theme';

export const themes: Theme[] = ['light', 'dark', 'system'];
