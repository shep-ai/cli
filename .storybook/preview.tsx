import type { Preview } from '@storybook/react';
import React, { useEffect } from 'react';
import '../src/presentation/web/app/globals.css';

// Decorator to handle theme based on background color
const ThemeDecorator = (
  Story: React.FC,
  context: { globals: { backgrounds?: { value?: string } } }
) => {
  const isDark = context.globals?.backgrounds?.value === '#0a0a0a';

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-[100px] font-sans antialiased">
      <Story />
    </div>
  );
};

// Applies full-page context background to all Drawers/ stories automatically
const DrawerPageDecorator = (Story: React.FC, context: { title?: string }) => {
  if (!context.title?.startsWith('Drawers/')) {
    return <Story />;
  }
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0a0a0a' },
      ],
    },
    layout: 'centered',
    options: {
      storySort: {
        order: ['Design System', 'Primitives', 'Composed', 'Layout', 'Features'],
      },
    },
  },
  decorators: [ThemeDecorator, DrawerPageDecorator],
};

export default preview;
