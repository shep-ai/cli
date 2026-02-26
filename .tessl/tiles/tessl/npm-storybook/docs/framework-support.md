# Framework Integration

Storybook provides comprehensive support for multiple frontend frameworks through specialized packages and builders. Each framework package includes optimized configuration, type definitions, and tooling integration.

## Capabilities

### React Integration

Complete React support with TypeScript integration, JSX handling, and React-specific features.

```typescript { .api }
// @storybook/react - Core React renderer
import type { Meta, StoryObj } from '@storybook/react';
import type { ReactRenderer } from '@storybook/react';

// React-specific types
interface ReactFramework {
  component: React.ComponentType<any>;
  storyResult: React.ReactElement<any>;
}

// Meta configuration for React components
type Meta<T = {}> = Meta<ReactRenderer, T>;
type StoryObj<T = {}> = StoryObj<ReactRenderer, T>;
```

**Usage Example:**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Example/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    backgroundColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};
```

### React + Vite Integration

Optimized React support with Vite builder for fast development and building.

```typescript { .api }
// @storybook/react-vite - React with Vite builder
interface ReactViteFramework extends ReactFramework {
  builder: '@storybook/builder-vite';
}

// Vite-specific configuration
interface ViteConfig {
  viteFinal?: (config: ViteConfig, options: Options) => ViteConfig | Promise<ViteConfig>;
}
```

**Configuration Example:**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    // Customize Vite config
    return {
      ...config,
      define: {
        ...config.define,
        __APP_VERSION__: JSON.stringify('1.0.0'),
      },
    };
  },
};

export default config;
```

### Vue 3 Integration

Complete Vue 3 support with Composition API, TypeScript, and Single File Components.

```typescript { .api }
// @storybook/vue3 - Vue 3 renderer
import type { Meta, StoryObj } from '@storybook/vue3';
import type { Vue3Renderer } from '@storybook/vue3';

// Vue 3 specific types
interface Vue3Framework {
  component: any; // Vue component
  storyResult: any; // Vue render result
}

type Meta<T = {}> = Meta<Vue3Renderer, T>;
type StoryObj<T = {}> = StoryObj<Vue3Renderer, T>;
```

**Usage Example:**

```typescript
import type { Meta, StoryObj } from '@storybook/vue3';
import MyButton from './MyButton.vue';

const meta: Meta<typeof MyButton> = {
  title: 'Example/MyButton',
  component: MyButton,
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    color: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    label: 'Button',
    size: 'medium',
    color: '#1976d2',
  },
};
```

### Angular Integration

Full Angular support with dependency injection, modules, and Angular-specific features.

```typescript { .api }
// @storybook/angular - Angular renderer
import type { Meta, StoryObj } from '@storybook/angular';
import type { AngularRenderer } from '@storybook/angular';

// Angular-specific types
interface AngularFramework {
  component: any; // Angular component
  storyResult: any; // Angular component result
}

type Meta<T = {}> = Meta<AngularRenderer, T>;
type StoryObj<T = {}> = StoryObj<AngularRenderer, T>;

// Angular module configuration
interface ModuleMeta extends Meta {
  moduleMetadata?: NgModule;
}
```

**Usage Example:**

```typescript
import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Example/Button',
  component: ButtonComponent,
  argTypes: {
    variant: {
      control: { type: 'radio' },
      options: ['primary', 'secondary', 'danger'],
    },
  },
  moduleMetadata: {
    imports: [CommonModule],
    providers: [ButtonService],
  },
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {
  args: {
    label: 'Button',
    variant: 'primary',
  },
};
```

### Svelte Integration

Svelte support with reactive statements, stores, and Svelte-specific features.

```typescript { .api }
// @storybook/svelte - Svelte renderer
import type { Meta, StoryObj } from '@storybook/svelte';
import type { SvelteRenderer } from '@storybook/svelte';

// Svelte-specific types
interface SvelteFramework {
  component: any; // Svelte component
  storyResult: any; // Svelte render result
}

type Meta<T = {}> = Meta<SvelteRenderer, T>;
type StoryObj<T = {}> = StoryObj<SvelteRenderer, T>;
```

**Usage Example:**

```typescript
import type { Meta, StoryObj } from '@storybook/svelte';
import Button from './Button.svelte';

const meta: Meta<Button> = {
  title: 'Example/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Button',
  },
};
```

### Web Components Integration

Support for Web Components and Custom Elements with lit-html rendering.

```typescript { .api }
// @storybook/web-components - Web Components renderer
import type { Meta, StoryObj } from '@storybook/web-components';
import type { WebComponentsRenderer } from '@storybook/web-components';

// Web Components specific types
interface WebComponentsFramework {
  component: string; // Tag name
  storyResult: TemplateResult; // lit-html template
}

type Meta<T = {}> = Meta<WebComponentsRenderer, T>;
type StoryObj<T = {}> = StoryObj<WebComponentsRenderer, T>;
```

**Usage Example:**

```typescript
import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './my-button.js';

const meta: Meta = {
  title: 'Example/MyButton',
  component: 'my-button',
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj;

export const Primary: Story = {
  render: (args) => html`
    <my-button variant=${args.variant} ?disabled=${args.disabled}> ${args.label} </my-button>
  `,
  args: {
    variant: 'primary',
    label: 'Button',
    disabled: false,
  },
};
```

## Builder Packages

### Vite Builder

Fast development and building with Vite's optimized bundling and HMR.

```typescript { .api }
// @storybook/builder-vite - Vite builder
interface ViteBuilder {
  name: '@storybook/builder-vite';
  options: ViteBuilderOptions;
}

interface ViteBuilderOptions {
  viteConfigPath?: string;
  viteFinal?: (config: ViteConfig) => ViteConfig | Promise<ViteConfig>;
}

// Vite configuration hook
function viteFinal(config: ViteConfig, options: Options): ViteConfig | Promise<ViteConfig>;
```

**Configuration Example:**

```typescript
// .storybook/main.ts
export default {
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: './vite.config.ts',
      },
    },
  },
  async viteFinal(config, { configType }) {
    if (configType === 'DEVELOPMENT') {
      // Development-specific config
      config.server = {
        ...config.server,
        port: 3000,
      };
    }

    return config;
  },
};
```

### Webpack 5 Builder

Production-ready building with Webpack 5's advanced features and optimizations.

```typescript { .api }
// @storybook/builder-webpack5 - Webpack 5 builder
interface Webpack5Builder {
  name: '@storybook/builder-webpack5';
  options: Webpack5BuilderOptions;
}

interface Webpack5BuilderOptions {
  lazyCompilation?: boolean;
  fsCache?: boolean;
}

// Webpack configuration hook
function webpackFinal(
  config: WebpackConfig,
  options: Options
): WebpackConfig | Promise<WebpackConfig>;
```

**Configuration Example:**

```typescript
// .storybook/main.ts
export default {
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      builder: {
        lazyCompilation: true,
        fsCache: true,
      },
    },
  },
  async webpackFinal(config, { configType }) {
    // Add custom webpack configuration
    config.module.rules.push({
      test: /\.scss$/,
      use: ['style-loader', 'css-loader', 'sass-loader'],
    });

    return config;
  },
};
```

## Framework Configuration

### Main Configuration Types

Framework-specific configuration interfaces for the main Storybook config.

```typescript { .api }
// Framework-specific StorybookConfig types
import type { StorybookConfig as ReactConfig } from '@storybook/react-vite';
import type { StorybookConfig as Vue3Config } from '@storybook/vue3-vite';
import type { StorybookConfig as AngularConfig } from '@storybook/angular';
import type { StorybookConfig as SvelteConfig } from '@storybook/svelte-vite';

// Base configuration interface
interface BaseStorybookConfig {
  stories: string[];
  addons: (string | { name: string; options?: any })[];
  framework: FrameworkConfig;
  typescript?: TypescriptConfig;
  features?: Features;
  core?: CoreConfig;
}

interface FrameworkConfig {
  name: string;
  options?: Record<string, any>;
}

interface TypescriptConfig {
  check?: boolean;
  reactDocgen?: 'react-docgen-typescript' | 'react-docgen' | false;
  reactDocgenTypescriptOptions?: any;
}
```

### Framework-Specific Features

Each framework package provides specialized features and integrations.

```typescript { .api }
// React-specific features
interface ReactFeatures {
  buildStoriesJson?: boolean;
  storyStoreV7?: boolean;
  modernInlineRender?: boolean;
  reactStrictMode?: boolean;
}

// Angular-specific features
interface AngularFeatures {
  buildStoriesJson?: boolean;
  compodoc?: boolean;
  compodocArgs?: string[];
}

// Vue-specific features
interface VueFeatures {
  buildStoriesJson?: boolean;
  vueDocgen?: boolean;
}
```

## Integration Patterns

### Multi-Framework Support

Supporting multiple frameworks in the same repository:

```typescript
// .storybook-react/main.ts
export default {
  stories: ["../src/**/*.react.stories.@(js|jsx|ts|tsx)"],
  framework: { name: "@storybook/react-vite" },
};

// .storybook-vue/main.ts
export default {
  stories: ["../src/**/*.vue.stories.@(js|ts)"],
  framework: { name: "@storybook/vue3-vite" },
};

// package.json scripts
{
  "storybook:react": "storybook dev --config-dir .storybook-react",
  "storybook:vue": "storybook dev --config-dir .storybook-vue"
}
```

### Custom Framework Configuration

Creating custom framework configurations:

```typescript
// custom-framework.ts
import type { StorybookConfig } from '@storybook/core-common';

export interface CustomFrameworkConfig extends StorybookConfig {
  framework: {
    name: './custom-framework';
    options: {
      customOption: boolean;
    };
  };
}

// Usage in main.ts
const config: CustomFrameworkConfig = {
  framework: {
    name: './custom-framework',
    options: {
      customOption: true,
    },
  },
};
```

### Framework Migration Helpers

Utilities for migrating between framework versions:

```bash
# Migrate from Create React App to Vite
storybook migrate cra-to-vite

# Migrate from Webpack to Vite
storybook migrate webpack5-to-vite

# Migrate from Vue 2 to Vue 3
storybook migrate vue2-to-vue3
```
