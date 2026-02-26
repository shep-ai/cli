# Theming and Customization

Complete theming system for customizing Storybook's UI appearance with pre-built themes and custom theme creation capabilities. Built on top of Emotion CSS-in-JS library for dynamic styling and theme switching.

## Capabilities

### Theme Creation

Create custom themes for Storybook's manager UI with extensive customization options.

```typescript { .api }
/**
 * Create a custom theme with optional variable overrides
 * @param vars - Partial theme variables to override defaults
 * @param rest - Additional theme properties
 * @returns Complete theme object with all variables resolved
 */
function create(vars?: ThemeVarsPartial, rest?: object): ThemeVars;

interface ThemeVars extends ThemeVarsBase, ThemeVarsColors {
  /** Base theme type - determines default color palette */
  base: 'light' | 'dark';

  /** Brand colors */
  colorPrimary: string;
  colorSecondary: string;

  /** Application background colors */
  appBg: string;
  appContentBg: string;
  appPreviewBg: string;
  appBorderColor: string;
  appBorderRadius: number;

  /** Typography */
  fontBase: string;
  fontCode: string;

  /** Text colors */
  textColor: string;
  textInverseColor: string;
  textMutedColor: string;

  /** Interactive element colors */
  barTextColor: string;
  barHoverColor: string;
  barSelectedColor: string;
  barBg: string;

  /** Input colors */
  inputBg: string;
  inputBorder: string;
  inputTextColor: string;
  inputBorderRadius: number;

  /** Layout dimensions */
  layoutMargin: number;
  addonActionsTheme: string;
}

type ThemeVarsPartial = Partial<ThemeVars>;
```

**Usage Example:**

```typescript
import { create } from 'storybook/theming';

// Create custom light theme
const customLightTheme = create({
  base: 'light',
  colorPrimary: '#FF6B6B',
  colorSecondary: '#4ECDC4',
  appBg: '#F8F9FA',
  appContentBg: '#FFFFFF',
  appBorderColor: '#E9ECEF',
  fontBase: '"Nunito Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  textColor: '#333333',
  barTextColor: '#666666',
});

// Create custom dark theme
const customDarkTheme = create({
  base: 'dark',
  colorPrimary: '#FF6B6B',
  colorSecondary: '#4ECDC4',
  appBg: '#1A1A1A',
  appContentBg: '#2A2A2A',
  appBorderColor: '#3A3A3A',
  textColor: '#FFFFFF',
  barTextColor: '#CCCCCC',
});

// Export for use in manager configuration
export { customLightTheme, customDarkTheme };
```

### Pre-built Themes

Access to Storybook's built-in themes for quick setup.

```typescript { .api }
/**
 * Pre-built theme objects
 */
const themes: {
  /** Light theme with default Storybook styling */
  light: ThemeVars;
  /** Dark theme with default Storybook styling */
  dark: ThemeVars;
  /** Alias for light theme */
  normal: ThemeVars;
};
```

**Usage Example:**

```typescript
import { themes } from 'storybook/theming';

// Use built-in themes directly
export const lightTheme = themes.light;
export const darkTheme = themes.dark;

// Extend built-in themes
export const customTheme = {
  ...themes.light,
  colorPrimary: '#FF6B6B',
  brandTitle: 'My Custom Storybook',
  brandUrl: 'https://example.com',
};
```

### Global Styles

Create global CSS styles for Storybook's UI components.

```typescript { .api }
/**
 * Create global styles for Storybook UI
 * @param theme - Theme object to base styles on
 * @returns Emotion Global component
 */
function createGlobal(theme?: ThemeVars): React.ComponentType;

/**
 * Create CSS reset styles
 * @returns Emotion Global component with reset styles
 */
function createReset(): React.ComponentType;
```

**Usage Example:**

```typescript
import { createGlobal, createReset, themes } from "storybook/theming";

// Create global styles component
const GlobalStyles = createGlobal(themes.light);

// Create reset styles component
const ResetStyles = createReset();

// Use in manager or preview
export const decorators = [
  (Story) => (
    <>
      <ResetStyles />
      <GlobalStyles />
      <Story />
    </>
  ),
];
```

### Color Utilities

Utility functions for color manipulation within themes.

```typescript { .api }
/**
 * Lighten a color by a percentage
 * @param color - Base color (hex, rgb, hsl, or named)
 * @param amount - Amount to lighten (0-1)
 * @returns Lightened color string
 */
function lighten(color: string, amount?: number): string;

/**
 * Darken a color by a percentage
 * @param color - Base color (hex, rgb, hsl, or named)
 * @param amount - Amount to darken (0-1)
 * @returns Darkened color string
 */
function darken(color: string, amount?: number): string;
```

**Usage Example:**

```typescript
import { create, lighten, darken } from 'storybook/theming';

const baseColor = '#3B82F6';

const theme = create({
  base: 'light',
  colorPrimary: baseColor,
  colorSecondary: lighten(baseColor, 0.2),
  appBorderColor: lighten(baseColor, 0.8),
  barHoverColor: darken(baseColor, 0.1),
});
```

## Emotion CSS-in-JS Integration

Storybook's theming system is built on Emotion and re-exports key utilities for custom styling.

### Styled Components

```typescript { .api }
/**
 * Create styled React components with theme support
 */
const styled: StyledInterface;

interface StyledInterface {
  <T extends React.ComponentType<any>>(component: T): StyledComponent<T>;
  [key: string]: StyledComponent<any>; // HTML elements (div, span, etc.)
}

type StyledComponent<T> = (
  template: TemplateStringsArray,
  ...args: Array<string | number | ((props: any) => string | number)>
) => React.ComponentType<T>;
```

### CSS and Keyframes

```typescript { .api }
/**
 * Create CSS styles with template literals
 * @param template - CSS template string
 * @param args - Interpolated values or functions
 * @returns Emotion CSS object
 */
function css(
  template: TemplateStringsArray,
  ...args: Array<string | number | ((props: any) => string | number)>
): string;

/**
 * Create CSS keyframe animations
 * @param template - Keyframes template string
 * @returns Animation name string
 */
function keyframes(template: TemplateStringsArray): string;
```

### Theme Provider and Hooks

```typescript { .api }
/**
 * Provide theme context to child components
 */
const ThemeProvider: React.ComponentType<{
  theme: ThemeVars;
  children: React.ReactNode;
}>;

/**
 * Access theme from context within components
 * @returns Current theme object
 */
function useTheme(): ThemeVars;

/**
 * HOC to inject theme as prop
 * @param Component - React component to wrap
 * @returns Component with theme prop injected
 */
function withTheme<P>(
  Component: React.ComponentType<P & { theme: ThemeVars }>
): React.ComponentType<P>;
```

### Global and Cache Components

```typescript { .api }
/**
 * Inject global styles into document head
 */
const Global: React.ComponentType<{
  styles: string | ((theme: ThemeVars) => string);
}>;

/**
 * Apply CSS class names conditionally
 */
const ClassNames: React.ComponentType<{
  children: (cx: (...classNames: (string | false | undefined)[]) => string) => React.ReactNode;
}>;

/**
 * Provide Emotion cache context
 */
const CacheProvider: React.ComponentType<{
  value: EmotionCache;
  children: React.ReactNode;
}>;

/**
 * Create Emotion cache instance
 * @param options - Cache configuration options
 * @returns Emotion cache instance
 */
function createCache(options: CacheOptions): EmotionCache;

interface CacheOptions {
  key: string;
  container?: HTMLElement;
  nonce?: string;
  prepend?: boolean;
  stylisPlugins?: any[];
}
```

**Usage Example:**

```typescript
import {
  styled,
  css,
  keyframes,
  ThemeProvider,
  useTheme,
  Global
} from "storybook/theming";

// Styled component with theme
const StyledButton = styled.button`
  background: ${(props) => props.theme.colorPrimary};
  color: ${(props) => props.theme.textInverseColor};
  border: none;
  border-radius: ${(props) => props.theme.appBorderRadius}px;
  padding: 8px 16px;
  font-family: ${(props) => props.theme.fontBase};

  &:hover {
    background: ${(props) => lighten(props.theme.colorPrimary, 0.1)};
  }
`;

// CSS styles
const cardStyles = css`
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 16px;
`;

// Keyframe animation
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Component using theme hook
const ThemedComponent = () => {
  const theme = useTheme();

  return (
    <div style={{ color: theme.textColor, background: theme.appBg }}>
      Themed content
    </div>
  );
};

// Usage with ThemeProvider
export const ThemedStory: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={customTheme}>
        <Global styles={`body { margin: 0; }`} />
        <Story />
      </ThemeProvider>
    ),
  ],
};
```

## Manager Configuration

Configure themes for Storybook's manager UI.

**Usage Example (.storybook/manager.js):**

```typescript
import { addons } from '@storybook/manager-api';
import { create } from 'storybook/theming';

const theme = create({
  base: 'light',
  brandTitle: 'My Custom Storybook',
  brandUrl: 'https://example.com',
  brandImage: 'https://example.com/logo.png',
  brandTarget: '_self',

  colorPrimary: '#FF6B6B',
  colorSecondary: '#4ECDC4',

  // UI colors
  appBg: '#F8F9FA',
  appContentBg: '#FFFFFF',
  appBorderColor: '#E9ECEF',
  appBorderRadius: 4,

  // Typography
  fontBase: '"Nunito Sans", sans-serif',
  fontCode: 'Monaco, "Courier New", monospace',

  // Text colors
  textColor: '#333333',
  textInverseColor: '#FFFFFF',

  // Toolbar colors
  barTextColor: '#666666',
  barSelectedColor: '#FF6B6B',
  barBg: '#FFFFFF',

  // Form colors
  inputBg: '#FFFFFF',
  inputBorder: '#E9ECEF',
  inputTextColor: '#333333',
  inputBorderRadius: 4,
});

addons.setConfig({
  theme,
});
```

## Advanced Theming Patterns

### Dynamic Theme Switching

```typescript
import { useState } from 'react';
import { ThemeProvider, themes } from 'storybook/theming';

export const DynamicThemeStory: Story = {
  render: () => {
    const [isDark, setIsDark] = useState(false);
    const currentTheme = isDark ? themes.dark : themes.light;

    return (
      <ThemeProvider theme={currentTheme}>
        <button onClick={() => setIsDark(!isDark)}>
          Switch to {isDark ? 'Light' : 'Dark'} Theme
        </button>
        <ThemedComponent />
      </ThemeProvider>
    );
  },
};
```

### CSS Custom Properties Integration

```typescript
const cssVariableTheme = create({
  base: 'light',
  colorPrimary: 'var(--primary-color, #3B82F6)',
  colorSecondary: 'var(--secondary-color, #10B981)',
  appBg: 'var(--app-bg, #FFFFFF)',
});
```
