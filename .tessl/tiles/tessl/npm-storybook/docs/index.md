# Storybook

Storybook is a comprehensive frontend workshop for building, documenting, and testing UI components in isolation across multiple frameworks including React, Vue, Angular, Svelte, and Web Components. It provides a complete development environment with CLI tools, development server, visual testing capabilities, and an extensive addon ecosystem for enhanced functionality.

## Package Information

- **Package Name**: storybook
- **Package Type**: npm
- **Language**: TypeScript/JavaScript
- **Installation**: `npm install storybook`

## Core Imports

The Storybook package provides multiple import paths for different functionalities:

```typescript
// Core functionality
import { composeStory, composeStories } from 'storybook/preview-api';
import { action, actions } from 'storybook/actions';
import { expect, userEvent } from 'storybook/test';
import { create, themes } from 'storybook/theming';

// Manager API (experimental)
import { useStorybookApi } from 'storybook/manager-api';

// Internal APIs (advanced usage)
import { styled, css } from 'storybook/internal/theming';
import { Button, Modal } from 'storybook/internal/components';
import { logger } from 'storybook/internal/client-logger';
```

For CommonJS:

```javascript
const { composeStory, composeStories } = require('storybook/preview-api');
const { action, actions } = require('storybook/actions');
const { expect, userEvent } = require('storybook/test');
const { create, themes } = require('storybook/theming');
```

## Basic Usage

```typescript
import { composeStory, setProjectAnnotations } from "storybook/preview-api";
import { action } from "storybook/actions";
import { expect, userEvent, within } from "storybook/test";

// Set up project-level configuration
setProjectAnnotations({
  parameters: {
    backgrounds: { default: 'light' }
  }
});

// Compose a story for testing
const ComposedButton = composeStory(ButtonStory, ButtonMeta);

// Use in tests
test('button handles click', async () => {
  const handleClick = action('clicked');
  render(<ComposedButton onClick={handleClick} />);

  const button = screen.getByRole('button');
  await userEvent.click(button);

  expect(handleClick).toHaveBeenCalledOnce();
});
```

## Architecture

Storybook is built around several key architectural components:

- **CLI Tools**: Command-line interface for project initialization, development, and build operations
- **Preview API**: Core story composition and execution engine for running stories outside Storybook
- **Manager API**: Experimental state management system for Storybook manager UI
- **Actions System**: Event tracking and logging for component interactions
- **Testing Integration**: Built-in testing utilities with instrumentation and mocking
- **Theming Engine**: Complete UI theming system based on Emotion CSS-in-JS
- **Framework Support**: Multiple framework packages (React, Vue, Angular, etc.) with corresponding builders
- **Addon Ecosystem**: Extensible plugin system for custom functionality
- **Internal APIs**: Advanced APIs for building addons and custom integrations

## Capabilities

### CLI Commands and Development Tools

Command-line interface for project initialization, development server, build operations, and project management. Essential for setting up and managing Storybook projects.

```typescript { .api }
// Primary CLI commands (via storybook binary)
storybook dev [options]     // Start development server
storybook build [options]   // Build static Storybook
storybook init [options]    // Initialize Storybook in project
storybook add <addon>       // Add an addon
storybook remove <addon>    // Remove an addon
storybook upgrade          // Upgrade Storybook packages
storybook info             // Environment debugging info
storybook migrate          // Run migration scripts
storybook sandbox          // Create sandbox templates
```

[CLI Commands and Tools](./cli-commands.md)

### Story Composition and Testing

Core functionality for composing and testing stories outside of the Storybook environment. Essential for unit testing, integration testing, and component validation workflows.

```typescript { .api }
function composeStory<TRenderer, TArgs>(
  story: Story<TRenderer, TArgs>,
  meta: Meta<TRenderer, TArgs>,
  projectAnnotations?: ProjectAnnotations<TRenderer>
): ComposedStory<TRenderer, TArgs>;

function composeStories<TModule extends StoriesModule>(
  module: TModule,
  projectAnnotations?: ProjectAnnotations<TRenderer>
): ComposedStoryModule<TModule>;

function setProjectAnnotations<TRenderer>(annotations: ProjectAnnotations<TRenderer>): void;
```

[Story Composition](./story-composition.md)

### Action Tracking

Action tracking system for logging and monitoring component interactions and events. Provides automatic event capture and manual action creation with configurable options.

```typescript { .api }
function action(name: string, options?: ActionOptions): HandlerFunction;

function actions<T extends string>(...handlers: T[]): ActionsMap<T>;
function actions<T extends string>(
  handlerMap: Record<T, string>,
  options?: ActionOptions
): ActionsMap<T>;

interface ActionOptions {
  depth?: number;
  clearOnStoryChange?: boolean;
  limit?: number;
  implicit?: boolean;
  id?: string;
}
```

[Actions and Event Tracking](./actions.md)

### Testing Utilities

Comprehensive testing utilities built on top of popular testing libraries with Storybook-specific instrumentation and integrations.

```typescript { .api }
const expect: Expect;
const userEvent: UserEvent;

interface MockUtilities {
  mock(path: string | Promise<unknown>, factory?: ModuleMockOptions): void;
}
const sb: MockUtilities;
```

[Testing and Mocking](./testing.md)

### Theming and Styling

Complete theming system for customizing Storybook's UI appearance with pre-built themes and custom theme creation capabilities.

```typescript { .api }
function create(vars?: ThemeVarsPartial, rest?: object): ThemeVars;

const themes: {
  light: ThemeVars;
  dark: ThemeVars;
  normal: ThemeVars;
};

interface ThemeVars {
  base: 'light' | 'dark';
  colorPrimary: string;
  colorSecondary: string;
  appBg: string;
  appContentBg: string;
  appPreviewBg: string;
  // ... extensive theming properties
}
```

[Theming and Customization](./theming.md)

### Component Highlighting

Visual highlighting system for emphasizing specific DOM elements within stories, useful for documentation and interactive tutorials.

```typescript { .api }
const HIGHLIGHT = 'storybook/highlight';
const REMOVE_HIGHLIGHT = 'storybook/remove-highlight';
const RESET_HIGHLIGHT = 'storybook/reset-highlight';
const SCROLL_INTO_VIEW = 'storybook/scroll-into-view';

interface HighlightOptions {
  elements: string[] | HTMLElement[];
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}
```

[Element Highlighting](./highlighting.md)

### Viewport Management

Viewport control system for testing components across different screen sizes and device configurations.

```typescript { .api }
interface Viewport {
  name: string;
  styles: ViewportStyles;
  type?: 'desktop' | 'mobile' | 'tablet' | 'other';
}

interface ViewportStyles {
  height: string;
  width: string;
}

type ViewportMap = Record<string, Viewport>;
```

[Viewport Control](./viewport.md)

### Manager API and State Management

Experimental API for Storybook manager-side state management and UI customization. Provides access to stories, addons, and global state.

```typescript { .api }
function useStorybookApi(): API;
function useStorybookState(): State;
function useChannel(): Channel;

interface API {
  selectStory: (storyId: string) => void;
  getCurrentStoryData: () => Story | undefined;
  setOptions: (options: Options) => void;
  addPanel: (id: string, panel: Panel) => void;
}
```

[Manager API](./manager-api.md)

### Framework Support

Framework-specific packages providing deep integration with popular frontend frameworks and their build tools.

```typescript { .api }
// Framework packages
import type { Meta, StoryObj } from '@storybook/react';
import type { Meta, StoryObj } from '@storybook/vue3';
import type { Meta, StoryObj } from '@storybook/angular';
import type { Meta, StoryObj } from '@storybook/svelte';

// Builder packages
import { viteFinal } from '@storybook/builder-vite';
import { webpackFinal } from '@storybook/builder-webpack5';
```

[Framework Integration](./framework-support.md)

### Internal APIs and Components

Advanced APIs and UI components for building custom addons and extending Storybook functionality. These are internal APIs that may change between versions.

```typescript { .api }
// Internal theming (Emotion-based)
import { styled, css, keyframes, ThemeProvider } from 'storybook/internal/theming';

// UI Components
import { Button, Modal, Tabs, Toolbar } from 'storybook/internal/components';

// Core utilities
import { logger } from 'storybook/internal/client-logger';
import { Channel } from 'storybook/internal/channels';

// CSF tools
import { loadCsf, writeCsf } from 'storybook/internal/csf-tools';
```

**Note**: Internal APIs are subject to change and should be used with caution. They are primarily intended for addon development and advanced customization scenarios.

## Core Types

```typescript { .api }
interface Story<TRenderer = unknown, TArgs = unknown> {
  (args: TArgs, context: StoryContext<TRenderer>): unknown;
  storyName?: string;
  parameters?: Parameters;
  args?: Partial<TArgs>;
  argTypes?: ArgTypes<TArgs>;
  decorators?: DecoratorFunction<TRenderer, TArgs>[];
}

interface Meta<TRenderer = unknown, TArgs = unknown> {
  title?: string;
  component?: unknown;
  parameters?: Parameters;
  args?: Partial<TArgs>;
  argTypes?: ArgTypes<TArgs>;
  decorators?: DecoratorFunction<TRenderer, TArgs>[];
}

interface StoryContext<TRenderer = unknown> {
  id: string;
  name: string;
  title: string;
  parameters: Parameters;
  args: Args;
  argTypes: ArgTypes;
  globals: Args;
  viewMode: ViewMode;
  loaded: Record<string, unknown>;
}

interface ComposedStory<TRenderer = unknown, TArgs = unknown> {
  (args?: Partial<TArgs>): unknown;
  id: string;
  storyName: string;
  args: TArgs;
  parameters: Parameters;
  argTypes: ArgTypes<TArgs>;
  play?: PlayFunction<TRenderer, TArgs>;
}

type ProjectAnnotations<TRenderer = unknown> = {
  parameters?: Parameters;
  decorators?: DecoratorFunction<TRenderer>[];
  args?: Args;
  argTypes?: ArgTypes;
  globals?: Args;
  globalTypes?: GlobalTypes;
};
```
