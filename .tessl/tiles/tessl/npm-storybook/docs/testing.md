# Testing and Mocking

Comprehensive testing utilities built on top of popular testing libraries with Storybook-specific instrumentation and integrations. Provides enhanced expect functionality, user interaction utilities, and module mocking capabilities.

## Capabilities

### Enhanced Expect

Storybook's expect is based on Chai with additional instrumentation for better integration with Storybook's testing ecosystem.

```typescript { .api }
/**
 * Enhanced expect function with Storybook instrumentation
 * Provides assertion capabilities with detailed error reporting
 */
const expect: Expect;

interface Expect {
  <T>(actual: T): ExpectStatic<T>;
  /** Check if value is null */
  (actual: null): ExpectStatic<null>;
  /** Check if value is undefined */
  (actual: undefined): ExpectStatic<undefined>;
  /** Use with spy assertions */
  <T extends (...args: any[]) => any>(actual: T): ExpectStatic<T>;
}

interface ExpectStatic<T> {
  /** Negates the assertion */
  not: ExpectStatic<T>;
  /** Basic equality assertion */
  toBe(expected: T): void;
  /** Deep equality assertion */
  toEqual(expected: T): void;
  /** Truthiness assertion */
  toBeTruthy(): void;
  /** Falsiness assertion */
  toBeFalsy(): void;
  /** Null assertion */
  toBeNull(): void;
  /** Undefined assertion */
  toBeUndefined(): void;
  /** Array/string contains assertion */
  toContain(expected: any): void;
  /** Function call assertion */
  toHaveBeenCalled(): void;
  /** Function call count assertion */
  toHaveBeenCalledTimes(times: number): void;
  /** Function call arguments assertion */
  toHaveBeenCalledWith(...args: any[]): void;
  // ... additional matchers
}
```

**Usage Example:**

```typescript
import { expect, userEvent, within } from "storybook/test";
import { composeStory } from "storybook/preview-api";
import { Primary } from "./Button.stories";

const ComposedButton = composeStory(Primary, ButtonMeta);

test("button interaction", async () => {
  const onClickSpy = vi.fn();
  render(<ComposedButton onClick={onClickSpy} />);

  const button = screen.getByRole("button");
  await userEvent.click(button);

  expect(onClickSpy).toHaveBeenCalledOnce();
  expect(button).toBeInTheDocument();
});
```

### User Event Utilities

User interaction testing utilities for simulating user actions with proper async handling and event propagation.

```typescript { .api }
/**
 * User event utilities for simulating user interactions
 * Provides type-safe, async user interaction methods
 */
const userEvent: UserEvent;

interface UserEvent {
  /** Setup user event with custom configuration */
  setup(options?: UserEventOptions): UserEventObject;
  /** Click an element */
  click(element: Element, options?: ClickOptions): Promise<void>;
  /** Double click an element */
  dblClick(element: Element, options?: ClickOptions): Promise<void>;
  /** Type text into an element */
  type(element: Element, text: string, options?: TypeOptions): Promise<void>;
  /** Clear and type text */
  clear(element: Element): Promise<void>;
  /** Select text in an input */
  selectAll(element: Element): Promise<void>;
  /** Tab to next/previous element */
  tab(options?: TabOptions): Promise<void>;
  /** Hover over an element */
  hover(element: Element): Promise<void>;
  /** Stop hovering over an element */
  unhover(element: Element): Promise<void>;
  /** Upload files to file input */
  upload(element: Element, files: File | File[]): Promise<void>;
}

interface UserEventOptions {
  /** Delay between events in milliseconds */
  delay?: number;
  /** Skip pointer events */
  skipPointerEventsCheck?: boolean;
  /** Skip hover events */
  skipHover?: boolean;
}

interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

interface TypeOptions {
  delay?: number;
  skipClick?: boolean;
  initialSelectionStart?: number;
  initialSelectionEnd?: number;
}
```

**Usage Example:**

```typescript
import { userEvent, within, expect } from 'storybook/test';

export const InteractiveForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Type in form fields
    await userEvent.type(canvas.getByLabelText(/name/i), 'John Doe');
    await userEvent.type(canvas.getByLabelText(/email/i), 'john@example.com');

    // Select dropdown option
    await userEvent.selectOptions(canvas.getByLabelText(/country/i), ['usa']);

    // Upload file
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    await userEvent.upload(canvas.getByLabelText(/avatar/i), file);

    // Submit form
    await userEvent.click(canvas.getByRole('button', { name: /submit/i }));

    // Verify results
    expect(canvas.getByText(/success/i)).toBeInTheDocument();
  },
};
```

### Module Mocking

Module mocking utilities for replacing imports and dependencies in tests and stories.

```typescript { .api }
/**
 * Storybook's module mocking utilities
 */
interface MockUtilities {
  /**
   * Mock a module with a factory function or mock implementation
   * @param path - Module path to mock (string or Promise for dynamic imports)
   * @param factory - Optional factory function to create mock implementation
   */
  mock(path: string | Promise<unknown>, factory?: ModuleMockOptions): void;
}

const sb: MockUtilities;

type ModuleMockOptions = (() => any) | { [key: string]: any } | any;
```

**Usage Example:**

```typescript
import { sb } from 'storybook/test';

// Mock an API module
sb.mock('./api/userService', () => ({
  fetchUser: vi.fn().mockResolvedValue({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
  }),
  updateUser: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock with partial implementation
sb.mock('./utils/analytics', () => ({
  track: vi.fn(),
  identify: vi.fn(),
  // Keep other exports as default
  ...vi.importActual('./utils/analytics'),
}));

// Use in story
export const ComponentWithMockedAPI: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Component will use mocked userService
    await userEvent.click(canvas.getByText('Load User'));

    // Verify mock was called
    const { fetchUser } = await import('./api/userService');
    expect(fetchUser).toHaveBeenCalledWith(1);
  },
};
```

## Testing Library Integration

Complete instrumented re-export of `@testing-library/dom` with Storybook-specific enhancements.

### Query Functions

```typescript { .api }
// Get* queries - throw error if not found
function getByRole(container: Element, role: string, options?: ByRoleOptions): HTMLElement;
function getByLabelText(
  container: Element,
  text: string,
  options?: SelectorMatcherOptions
): HTMLElement;
function getByText(container: Element, text: string, options?: SelectorMatcherOptions): HTMLElement;
function getByDisplayValue(
  container: Element,
  value: string,
  options?: SelectorMatcherOptions
): HTMLElement;
function getByAltText(
  container: Element,
  text: string,
  options?: SelectorMatcherOptions
): HTMLElement;
function getByTitle(
  container: Element,
  text: string,
  options?: SelectorMatcherOptions
): HTMLElement;
function getByTestId(
  container: Element,
  testId: string,
  options?: SelectorMatcherOptions
): HTMLElement;

// GetAll* queries - return array, throw if none found
function getAllByRole(container: Element, role: string, options?: ByRoleOptions): HTMLElement[];
// ... similar pattern for other queries

// Query* queries - return null if not found
function queryByRole(container: Element, role: string, options?: ByRoleOptions): HTMLElement | null;
// ... similar pattern for other queries

// QueryAll* queries - return empty array if none found
function queryAllByRole(container: Element, role: string, options?: ByRoleOptions): HTMLElement[];
// ... similar pattern for other queries

// Find* queries - return promise, reject if not found after timeout
function findByRole(
  container: Element,
  role: string,
  options?: ByRoleOptions
): Promise<HTMLElement>;
// ... similar pattern for other queries

// FindAll* queries - return promise of array
function findAllByRole(
  container: Element,
  role: string,
  options?: ByRoleOptions
): Promise<HTMLElement[]>;
// ... similar pattern for other queries
```

### Event Utilities

```typescript { .api }
/**
 * Fire DOM events on elements
 */
const fireEvent: {
  [K in keyof HTMLElementEventMap]: (
    element: Element,
    eventProperties?: Partial<HTMLElementEventMap[K]>
  ) => boolean;
} & {
  /** Create a DOM event */
  createEvent: (eventName: string, node?: Element, init?: object) => Event;
};
```

### Async Utilities

```typescript { .api }
/**
 * Wait for element to appear or condition to be met
 * @param callback - Function to execute and wait for
 * @param options - Configuration options
 */
function waitFor<T>(callback: () => T | Promise<T>, options?: WaitForOptions): Promise<T>;

/**
 * Wait for element to be removed from DOM
 * @param element - Element to wait for removal
 * @param options - Configuration options
 */
function waitForElementToBeRemoved<T>(element: T, options?: WaitForOptions): Promise<void>;

interface WaitForOptions {
  timeout?: number;
  interval?: number;
  onTimeout?: (error: Error) => Error;
}
```

### Screen and Within

```typescript { .api }
/**
 * Global screen object for querying document
 */
const screen: Screen;

interface Screen {
  getByRole: (role: string, options?: ByRoleOptions) => HTMLElement;
  getAllByRole: (role: string, options?: ByRoleOptions) => HTMLElement[];
  queryByRole: (role: string, options?: ByRoleOptions) => HTMLElement | null;
  // ... all query methods available on screen
}

/**
 * Scope queries to a specific container element
 * @param element - Container element to scope queries to
 * @returns Object with all query methods scoped to the container
 */
function within(element: Element): Screen;
```

**Usage Example:**

```typescript
import { screen, within, waitFor, fireEvent } from 'storybook/test';

export const AsyncComponent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click button to trigger async action
    fireEvent.click(canvas.getByRole('button', { name: /load data/i }));

    // Wait for loading to complete
    await waitFor(() => {
      expect(canvas.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify data loaded
    expect(canvas.getByText(/data loaded successfully/i)).toBeInTheDocument();
  },
};
```

## Configuration and Setup

### Test Parameters

Configure testing behavior at story or project level.

```typescript { .api }
interface TestParameters {
  /** Disable testing for this story */
  disable?: boolean;
  /** Custom test timeout */
  timeout?: number;
  /** Skip certain test assertions */
  skip?: string[];
}
```

**Usage Example:**

```typescript
export const LongRunningTest: Story = {
  parameters: {
    test: {
      timeout: 10000, // 10 second timeout
    },
  },
  play: async ({ canvasElement }) => {
    // Long-running test logic
  },
};
```
