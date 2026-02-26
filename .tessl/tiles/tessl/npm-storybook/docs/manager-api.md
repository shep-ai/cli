# Manager API

Experimental API for Storybook manager-side state management and UI customization. The Manager API provides access to stories, addons, global state, and UI elements within the Storybook manager interface.

**Note**: This API is experimental and may change in future versions. It's primarily intended for addon development and advanced customization scenarios.

## Capabilities

### Core Manager Hooks

Access to the main Storybook API and state management hooks.

```typescript { .api }
/**
 * Get access to the Storybook API object with methods for controlling the manager
 * @returns The Storybook API instance
 */
function useStorybookApi(): API;

/**
 * Access the current Storybook state
 * @returns The current state object
 */
function useStorybookState(): State;

/**
 * Get access to the communication channel between manager and preview
 * @returns Channel instance for cross-frame communication
 */
function useChannel(): Channel;

/**
 * Access specific addon state
 * @param addonId - The addon identifier
 * @returns Addon-specific state
 */
function useAddonState<T>(addonId: string): [T, (newState: T) => void];

/**
 * Access global parameters
 * @returns Current global parameters
 */
function useGlobals(): [Args, (newGlobals: Args) => void];
```

**Usage Example:**

```typescript
import { useStorybookApi, useStorybookState } from "storybook/manager-api";

export const MyAddonPanel = () => {
  const api = useStorybookApi();
  const state = useStorybookState();

  const handleStorySelect = (storyId: string) => {
    api.selectStory(storyId);
  };

  return (
    <div>
      <h3>Current Story: {state.storyId}</h3>
      <button onClick={() => handleStorySelect('example-button--primary')}>
        Go to Primary Button
      </button>
    </div>
  );
};
```

### Storybook API Interface

The main API object provides methods for controlling and querying the Storybook manager.

```typescript { .api }
interface API {
  /** Navigate to a specific story */
  selectStory: (storyId: string, viewMode?: ViewMode) => void;

  /** Get current story data */
  getCurrentStoryData: () => Story | undefined;

  /** Get all stories */
  getStories: () => StoriesHash;

  /** Get story by ID */
  getStory: (storyId: string) => Story | undefined;

  /** Set global options */
  setOptions: (options: Options) => void;

  /** Add a panel to the addon panel area */
  addPanel: (id: string, panel: Panel) => void;

  /** Add a tool to the toolbar */
  addToolbarItem: (id: string, item: ToolbarItem) => void;

  /** Show/hide addon panel */
  togglePanel: (panelId?: string) => void;

  /** Toggle fullscreen mode */
  toggleFullscreen: () => void;

  /** Navigate to specific view mode */
  setViewMode: (viewMode: ViewMode) => void;

  /** Update URL without navigation */
  setQueryParams: (params: QueryParams) => void;

  /** Emit events to preview */
  emit: (eventName: string, ...args: any[]) => void;

  /** Listen to events from preview */
  on: (eventName: string, handler: (...args: any[]) => void) => () => void;

  /** Remove event listener */
  off: (eventName: string, handler: (...args: any[]) => void) => void;
}

type ViewMode = 'story' | 'docs';

interface Options {
  isFullscreen?: boolean;
  showPanel?: boolean;
  panelPosition?: 'bottom' | 'right';
  showNav?: boolean;
  showToolbar?: boolean;
  initialActive?: string;
  sidebar?: {
    showRoots?: boolean;
    collapsedRoots?: string[];
  };
}

interface Panel {
  title: string;
  render: (options: { active: boolean; key: string }) => React.ReactNode;
  paramKey?: string;
  disabled?: boolean;
}

interface ToolbarItem {
  title: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  render?: () => React.ReactNode;
  disabled?: boolean;
}
```

### State Interface

The state object contains all current Storybook manager state.

```typescript { .api }
interface State {
  /** Currently selected story ID */
  storyId: string;

  /** Current view mode */
  viewMode: ViewMode;

  /** All stories indexed by ID */
  storiesHash: StoriesHash;

  /** Stories configuration */
  storiesConfigured: boolean;

  /** Global parameters */
  globals: Args;

  /** Global types */
  globalTypes: GlobalTypes;

  /** UI state */
  ui: {
    name?: string;
    url?: string;
    enableShortcuts: boolean;
    sidebarAnimations: boolean;
  };

  /** Layout state */
  layout: {
    isFullscreen: boolean;
    showPanel: boolean;
    panelPosition: 'bottom' | 'right';
    showNav: boolean;
    showToolbar: boolean;
  };

  /** Currently selected panel */
  selectedPanel?: string;

  /** Addon state */
  addons: Record<string, any>;
}

interface StoriesHash {
  [storyId: string]: Story | Group;
}

interface Group {
  id: string;
  name: string;
  parent?: string;
  depth: number;
  children: string[];
  isComponent: boolean;
  isLeaf: boolean;
  isRoot: boolean;
}
```

### Channel Communication

Communication channel for manager-preview messaging.

```typescript { .api }
interface Channel {
  /** Emit event to preview */
  emit: (eventName: string, ...args: any[]) => void;

  /** Listen to events from preview */
  on: (eventName: string, handler: (...args: any[]) => void) => () => void;

  /** Remove event listener */
  off: (eventName: string, handler: (...args: any[]) => void) => void;

  /** Listen to event once */
  once: (eventName: string, handler: (...args: any[]) => void) => () => void;

  /** Remove all listeners for event */
  removeAllListeners: (eventName?: string) => void;
}

// Common channel events
const STORY_CHANGED = 'storyChanged';
const STORY_RENDERED = 'storyRendered';
const STORY_THREW_EXCEPTION = 'storyThrewException';
const STORY_MISSING = 'storyMissing';
const SET_CURRENT_STORY = 'setCurrentStory';
const SELECT_STORY = 'selectStory';
const GLOBALS_UPDATED = 'globalsUpdated';
```

**Usage Example:**

```typescript
import { useChannel } from "storybook/manager-api";

export const MyAddon = () => {
  const emit = useChannel({
    [STORY_CHANGED]: (storyId) => {
      console.log('Story changed to:', storyId);
    },
    [GLOBALS_UPDATED]: (globals) => {
      console.log('Globals updated:', globals);
    },
  });

  const handleTriggerAction = () => {
    emit('myCustomEvent', { data: 'example' });
  };

  return (
    <button onClick={handleTriggerAction}>
      Trigger Custom Event
    </button>
  );
};
```

### Addon Development Utilities

Utilities specifically for developing Storybook addons.

```typescript { .api }
/**
 * Register an addon panel
 * @param addonId - Unique addon identifier
 * @param panel - Panel configuration
 */
function addPanel(addonId: string, panel: Panel): void;

/**
 * Register a toolbar item
 * @param addonId - Unique addon identifier
 * @param item - Toolbar item configuration
 */
function addToolbarItem(addonId: string, item: ToolbarItem): void;

/**
 * Register addon decorator
 * @param decorator - Decorator function
 */
function addDecorator(decorator: DecoratorFunction): void;

/**
 * Add global types for addon parameters
 * @param globalTypes - Global type definitions
 */
function addGlobalTypes(globalTypes: GlobalTypes): void;

interface GlobalTypes {
  [key: string]: {
    name: string;
    description?: string;
    defaultValue?: any;
    toolbar?: {
      title?: string;
      icon?: string;
      items: ToolbarMenuItems;
      dynamicTitle?: boolean;
    };
  };
}

type ToolbarMenuItems = Array<{
  value: string;
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}>;
```

**Usage Example:**

```typescript
import { addPanel, addToolbarItem } from "storybook/manager-api";

// Register addon panel
addPanel('my-addon/panel', {
  title: 'My Addon',
  render: ({ active }) => (
    <div style={{ padding: 10 }}>
      {active ? 'Panel is active!' : 'Panel is inactive'}
    </div>
  ),
});

// Register toolbar item
addToolbarItem('my-addon/toolbar', {
  title: 'My Tool',
  icon: '🔧',
  onClick: () => {
    console.log('Toolbar item clicked');
  },
});
```

## Advanced Usage Patterns

### Custom Addon State Management

```typescript
import { useAddonState, useChannel } from "storybook/manager-api";

interface MyAddonState {
  enabled: boolean;
  settings: Record<string, any>;
}

export const MyAddonManager = () => {
  const [addonState, setAddonState] = useAddonState<MyAddonState>('my-addon', {
    enabled: true,
    settings: {},
  });

  const emit = useChannel({
    'my-addon/settings-changed': (newSettings) => {
      setAddonState({
        ...addonState,
        settings: newSettings,
      });
    },
  });

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={addonState.enabled}
          onChange={(e) =>
            setAddonState({ ...addonState, enabled: e.target.checked })
          }
        />
        Enable Addon
      </label>
    </div>
  );
};
```

### Story Navigation Helper

```typescript
import { useStorybookApi, useStorybookState } from "storybook/manager-api";

export const StoryNavigator = () => {
  const api = useStorybookApi();
  const state = useStorybookState();

  const stories = Object.values(state.storiesHash).filter(
    (item): item is Story => item.isLeaf
  );

  const currentIndex = stories.findIndex(story => story.id === state.storyId);

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % stories.length;
    api.selectStory(stories[nextIndex].id);
  };

  const goToPrevious = () => {
    const prevIndex = currentIndex === 0 ? stories.length - 1 : currentIndex - 1;
    api.selectStory(stories[prevIndex].id);
  };

  return (
    <div>
      <button onClick={goToPrevious}>← Previous</button>
      <span>{currentIndex + 1} of {stories.length}</span>
      <button onClick={goToNext}>Next →</button>
    </div>
  );
};
```
