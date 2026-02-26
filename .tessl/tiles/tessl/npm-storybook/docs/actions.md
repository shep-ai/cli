# Actions and Event Tracking

Action tracking system for logging and monitoring component interactions and events. Actions provide automatic event capture and manual action creation with configurable options for debugging and testing component behavior.

## Capabilities

### Single Action Creation

Creates a single action handler for tracking specific events.

```typescript { .api }
/**
 * Create a single action handler for event tracking
 * @param name - The display name for the action in the Actions panel
 * @param options - Optional configuration for action behavior
 * @returns Function that logs events when called
 */
function action(name: string, options?: ActionOptions): HandlerFunction;

type HandlerFunction = (...args: any[]) => void;

interface ActionOptions extends Partial<TelejsonOptions> {
  /** Maximum depth for object serialization (default: 3) */
  depth?: number;
  /** Clear actions when story changes (default: true) */
  clearOnStoryChange?: boolean;
  /** Maximum number of actions to display (default: 5) */
  limit?: number;
  /** Mark as implicit action (for automatic detection) */
  implicit?: boolean;
  /** Custom identifier for the action */
  id?: string;
  // Additional serialization options inherited from TelejsonOptions
}
```

**Usage Example:**

```typescript
import { action } from "storybook/actions";

export const ButtonWithAction: Story = {
  render: (args) => (
    <button onClick={action("clicked")} {...args}>
      Click me
    </button>
  ),
  args: {
    children: "Button",
  },
};

// With options
export const ButtonWithDetailedAction: Story = {
  render: (args) => (
    <button
      onClick={action("button-clicked", {
        depth: 5,
        limit: 10
      })}
      {...args}
    >
      Click me
    </button>
  ),
};
```

### Multiple Actions Creation

Creates multiple action handlers at once using various patterns.

```typescript { .api }
/**
 * Create multiple action handlers from a list of names
 * @param handlers - Array of action names
 * @returns Object mapping each name to its action handler
 */
function actions<T extends string>(...handlers: T[]): ActionsMap<T>;

/**
 * Create multiple action handlers from a name-to-display mapping
 * @param handlerMap - Object mapping handler names to display names
 * @param options - Optional configuration applied to all actions
 * @returns Object mapping each handler name to its action function
 */
function actions<T extends string>(
  handlerMap: Record<T, string>,
  options?: ActionOptions
): ActionsMap<T>;

type ActionsMap<T extends string> = Record<T, HandlerFunction>;
```

**Usage Examples:**

```typescript
import { actions } from "storybook/actions";

// Create actions from names
const eventHandlers = actions("onClick", "onHover", "onFocus");

export const InteractiveComponent: Story = {
  render: (args) => (
    <div
      onClick={eventHandlers.onClick}
      onMouseEnter={eventHandlers.onHover}
      onFocus={eventHandlers.onFocus}
      {...args}
    >
      Interactive element
    </div>
  ),
};

// Create actions with custom display names
const customActions = actions(
  {
    handleSubmit: "Form submitted",
    handleCancel: "Form cancelled",
    handleReset: "Form reset",
  },
  { depth: 4 }
);

export const FormComponent: Story = {
  render: (args) => (
    <form>
      <button type="submit" onClick={customActions.handleSubmit}>
        Submit
      </button>
      <button type="button" onClick={customActions.handleCancel}>
        Cancel
      </button>
      <button type="reset" onClick={customActions.handleReset}>
        Reset
      </button>
    </form>
  ),
};
```

### Legacy Decorator (Deprecated)

The `withActions` decorator is deprecated in Storybook v10+ but still available for backward compatibility.

```typescript { .api }
/**
 * Legacy decorator for automatic action detection
 * @deprecated Use action() function directly instead
 */
const withActions: DecoratorFunction;
```

## Action Configuration

### Global Action Parameters

Configure actions behavior at the story or project level using parameters.

```typescript { .api }
interface ActionParameters {
  /** Automatically create actions for props matching this regex */
  argTypesRegex?: string;
  /** Disable actions entirely */
  disable?: boolean;
  /** Array of specific prop names to create actions for */
  handles?: string[];
}
```

**Usage Example:**

```typescript
// In .storybook/preview.js or story parameters
export const parameters = {
  actions: {
    argTypesRegex: '^on[A-Z].*', // Automatically create actions for props starting with "on"
  },
};

// Or per story
export const MyStory: Story = {
  parameters: {
    actions: {
      handles: ['onClick', 'onSubmit', 'onCancel'],
    },
  },
};
```

## Events and Constants

```typescript { .api }
/** Action addon identifier */
const ADDON_ID = 'storybook/actions';

/** Parameter key for action configuration */
const PARAM_KEY = 'actions';

/** Event emitted when an action occurs */
const EVENT_ID = 'storybook/action';

/** Event emitted to clear all actions */
const CLEAR_ID = 'storybook/clear-actions';
```

## Action Display Types

```typescript { .api }
interface ActionDisplay {
  /** Unique identifier for the action event */
  id: string;
  /** Number of times this action has been triggered */
  count: number;
  /** Action data including name and arguments */
  data: {
    name: string;
    args: any[];
  };
  /** Configuration options used for this action */
  options: ActionOptions;
}
```

## Advanced Usage Patterns

### Custom Action Serialization

```typescript
import { action } from "storybook/actions";

// Custom serialization for complex objects
const handleComplexEvent = action("complex-event", {
  depth: 10, // Deep serialization
  limit: 20  // More history
});

export const ComplexComponent: Story = {
  render: () => (
    <ComplexForm
      onSubmit={(formData) => {
        handleComplexEvent({
          timestamp: Date.now(),
          formData,
          validationErrors: formData.errors
        });
      }}
    />
  ),
};
```

### Conditional Actions

```typescript
import { action } from "storybook/actions";

const conditionalAction = (condition: boolean) =>
  condition ? action("conditional-action") : () => {};

export const ConditionalStory: Story = {
  render: (args) => (
    <button onClick={conditionalAction(args.enableLogging)}>
      Click me
    </button>
  ),
  args: {
    enableLogging: true,
  },
  argTypes: {
    enableLogging: { control: "boolean" },
  },
};
```

### Integration with Component Props

```typescript
import { actions } from "storybook/actions";

interface ButtonProps {
  onClick?: () => void;
  onDoubleClick?: () => void;
  onMouseEnter?: () => void;
}

const eventHandlers = actions("onClick", "onDoubleClick", "onMouseEnter");

export const FullyTrackedButton: Story<ButtonProps> = {
  render: (args) => <Button {...args} {...eventHandlers} />,
  args: {
    children: "Tracked Button",
  },
};
```
