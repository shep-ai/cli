# Story Composition

Story composition functionality for creating and testing stories outside of the Storybook environment. This is essential for unit testing, integration testing, and component validation workflows.

## Capabilities

### Compose Single Story

Creates a composed story that can be rendered and tested independently.

```typescript { .api }
/**
 * Compose a single story for independent testing and rendering
 * @param story - The story function to compose
 * @param meta - The meta object containing story metadata
 * @param projectAnnotations - Optional project-level annotations
 * @returns A composed story function with additional metadata
 */
function composeStory<TRenderer, TArgs>(
  story: Story<TRenderer, TArgs>,
  meta: Meta<TRenderer, TArgs>,
  projectAnnotations?: ProjectAnnotations<TRenderer>
): ComposedStory<TRenderer, TArgs>;

interface ComposedStory<TRenderer = unknown, TArgs = unknown> {
  (args?: Partial<TArgs>): unknown;
  id: string;
  storyName: string;
  args: TArgs;
  parameters: Parameters;
  argTypes: ArgTypes<TArgs>;
  play?: PlayFunction<TRenderer, TArgs>;
}
```

**Usage Example:**

```typescript
import { composeStory } from "storybook/preview-api";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Button> = {
  title: "Example/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    backgroundColor: { control: "color" },
  },
};

const Primary: StoryObj<typeof meta> = {
  args: {
    primary: true,
    label: "Button",
  },
};

// Compose the story for testing
const ComposedPrimary = composeStory(Primary, meta);

// Use in tests
test("renders primary button", () => {
  render(<ComposedPrimary />);
  const button = screen.getByRole("button");
  expect(button).toHaveClass("storybook-button--primary");
});
```

### Compose All Stories

Composes all stories from a stories module for bulk testing operations.

```typescript { .api }
/**
 * Compose all stories from a stories module
 * @param module - The stories module containing meta and stories
 * @param projectAnnotations - Optional project-level annotations
 * @returns Object containing all composed stories indexed by story ID
 */
function composeStories<TModule extends StoriesModule>(
  module: TModule,
  projectAnnotations?: ProjectAnnotations<TRenderer>
): ComposedStoryModule<TModule>;

type ComposedStoryModule<TModule extends StoriesModule> = {
  [K in keyof Omit<TModule, 'default'>]: TModule[K] extends Story<infer TRenderer, infer TArgs>
    ? ComposedStory<TRenderer, TArgs>
    : never;
};

interface StoriesModule {
  default: Meta;
  [key: string]: Story | Meta;
}
```

**Usage Example:**

```typescript
import { composeStories } from "storybook/preview-api";
import * as stories from "./Button.stories";

const { Primary, Secondary, Large, Small } = composeStories(stories);

describe("Button stories", () => {
  test("Primary story renders correctly", () => {
    render(<Primary />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  test("Secondary story renders correctly", () => {
    render(<Secondary />);
    expect(screen.getByRole("button")).toHaveClass("storybook-button--secondary");
  });
});
```

### Set Project Annotations

Configures project-level annotations that apply to all composed stories.

```typescript { .api }
/**
 * Set project-level annotations for all composed stories
 * @param annotations - Project-wide configuration or array of configurations to merge
 */
function setProjectAnnotations<TRenderer>(
  annotations: ProjectAnnotations<TRenderer> | ProjectAnnotations<TRenderer>[]
): void;

interface ProjectAnnotations<TRenderer = unknown> {
  parameters?: Parameters;
  decorators?: DecoratorFunction<TRenderer>[];
  args?: Args;
  argTypes?: ArgTypes;
  globals?: Args;
  globalTypes?: GlobalTypes;
}
```

**Usage Example:**

```typescript
import { setProjectAnnotations } from "storybook/preview-api";

// Set up global configuration
setProjectAnnotations({
  parameters: {
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#ffffff" },
        { name: "dark", value: "#333333" },
      ],
    },
    actions: { argTypesRegex: "^on[A-Z].*" },
  },
  decorators: [
    (Story) => (
      <div style={{ margin: "3em" }}>
        <Story />
      </div>
    ),
  ],
  globals: {
    backgrounds: { value: "light" },
  },
});
```

## Hook API for Stories

Storybook provides React-like hooks that can be used within stories and decorators for state management and side effects.

### Story Context Hooks

```typescript { .api }
/**
 * Access story arguments with update capability
 * @returns Tuple of current args, update function, and reset function
 */
function useArgs<TArgs>(): [
  TArgs,
  (newArgs: Partial<TArgs>) => void,
  (argNames?: (keyof TArgs)[]) => void,
];

/**
 * Access global parameters with update capability
 * @returns Tuple of current globals and update function
 */
function useGlobals(): [Args, (newGlobals: Args) => void];

/**
 * Access a specific story parameter
 * @param parameterKey - The parameter key to retrieve
 * @param defaultValue - Default value if parameter is undefined
 * @returns The parameter value or undefined
 */
function useParameter<S>(parameterKey: string, defaultValue?: S): S | undefined;

/**
 * Access the complete story context
 * @returns The current story context object
 */
function useStoryContext<TRenderer>(): StoryContext<TRenderer>;
```

### Standard React-style Hooks

```typescript { .api }
function useState<S>(initialState: S | (() => S)): [S, (update: S | ((prevState: S) => S)) => void];
function useEffect(create: () => (() => void) | void, deps?: any[]): void;
function useReducer<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S
): [S, (action: A) => void];
function useMemo<T>(nextCreate: () => T, deps?: any[]): T;
function useCallback<T>(callback: T, deps?: any[]): T;
function useRef<T>(initialValue: T): { current: T };
```

**Usage Example:**

```typescript
import { useArgs, useEffect } from "storybook/preview-api";

export const InteractiveButton: Story = {
  render: (args) => {
    const [{ count }, updateArgs] = useArgs();

    useEffect(() => {
      console.log("Button count changed:", count);
    }, [count]);

    return (
      <button
        onClick={() => updateArgs({ count: (count || 0) + 1 })}
        {...args}
      >
        Clicked {count || 0} times
      </button>
    );
  },
  args: {
    count: 0,
  },
};
```

## Core Types

```typescript { .api }
interface Story<TRenderer = unknown, TArgs = unknown> {
  (args: TArgs, context: StoryContext<TRenderer>): unknown;
  storyName?: string;
  parameters?: Parameters;
  args?: Partial<TArgs>;
  argTypes?: ArgTypes<TArgs>;
  decorators?: DecoratorFunction<TRenderer, TArgs>[];
  play?: PlayFunction<TRenderer, TArgs>;
}

interface Meta<TRenderer = unknown, TArgs = unknown> {
  title?: string;
  component?: unknown;
  subcomponents?: Record<string, unknown>;
  parameters?: Parameters;
  args?: Partial<TArgs>;
  argTypes?: ArgTypes<TArgs>;
  decorators?: DecoratorFunction<TRenderer, TArgs>[];
  loaders?: LoaderFunction<TRenderer, TArgs>[];
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
  abortSignal: AbortSignal;
}

type DecoratorFunction<TRenderer = unknown, TArgs = unknown> = (
  story: () => unknown,
  context: StoryContext<TRenderer>
) => unknown;

type PlayFunction<TRenderer = unknown, TArgs = unknown> = (
  context: StoryContext<TRenderer> & { canvasElement: HTMLElement }
) => Promise<void> | void;
```
