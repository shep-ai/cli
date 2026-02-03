import type { StorybookConfig } from '@storybook/react-vite';
import { resolve } from 'path';

const config: StorybookConfig = {
  stories: ['../src/presentation/web/**/*.stories.@(js|jsx|mjs|ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-links'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components': resolve(__dirname, '../src/presentation/web/components'),
      '@/lib': resolve(__dirname, '../src/presentation/web/lib'),
      '@/hooks': resolve(__dirname, '../src/presentation/web/hooks'),
      '@/types': resolve(__dirname, '../src/presentation/web/types'),
    };
    return config;
  },
};

export default config;
