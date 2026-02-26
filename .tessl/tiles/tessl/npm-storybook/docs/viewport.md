# Viewport Control

Viewport control system for testing components across different screen sizes and device configurations. Provides pre-defined device viewports and the ability to create custom viewport configurations for responsive design testing.

## Capabilities

### Viewport Configuration

Core interfaces for defining viewport dimensions and device characteristics.

```typescript { .api }
interface Viewport {
  /** Display name for the viewport */
  name: string;
  /** CSS styles defining viewport dimensions */
  styles: ViewportStyles;
  /** Optional device category for organization */
  type?: 'desktop' | 'mobile' | 'tablet' | 'other';
}

interface ViewportStyles {
  /** Viewport height (CSS value) */
  height: string;
  /** Viewport width (CSS value) */
  width: string;
}

/** Collection of viewport configurations indexed by key */
type ViewportMap = Record<string, Viewport>;
```

**Usage Example:**

```typescript
// Define custom viewports
const customViewports: ViewportMap = {
  small: {
    name: 'Small Mobile',
    styles: {
      width: '320px',
      height: '568px',
    },
    type: 'mobile',
  },
  medium: {
    name: 'Medium Tablet',
    styles: {
      width: '768px',
      height: '1024px',
    },
    type: 'tablet',
  },
  large: {
    name: 'Large Desktop',
    styles: {
      width: '1440px',
      height: '900px',
    },
    type: 'desktop',
  },
};

// Use in Storybook configuration
export const parameters = {
  viewport: {
    viewports: customViewports,
    defaultViewport: 'medium',
  },
};
```

### Global Viewport State

State management interface for viewport selection and rotation.

```typescript { .api }
interface GlobalState {
  /** Currently selected viewport key */
  value: string | undefined;
  /** Whether the viewport is rotated 90 degrees */
  isRotated?: boolean;
}
```

### Story-Level Viewport Parameters

Configure viewport behavior for individual stories or components.

```typescript { .api }
interface ViewportParameters {
  viewport?: {
    /** Disable viewport controls for this story */
    disable?: boolean;
    /** Available viewport options (overrides global) */
    options?: ViewportMap;
    /** Default viewport for this story */
    defaultViewport?: string;
  };
}
```

**Usage Example:**

```typescript
export const MobileOnlyComponent: Story = {
  parameters: {
    viewport: {
      options: {
        mobile: {
          name: 'iPhone SE',
          styles: { width: '375px', height: '667px' },
          type: 'mobile',
        },
        mobileLandscape: {
          name: 'iPhone SE Landscape',
          styles: { width: '667px', height: '375px' },
          type: 'mobile',
        },
      },
      defaultViewport: 'mobile',
    },
  },
  render: () => (
    <div style={{
      padding: '16px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>Mobile-Optimized Component</h1>
      <p>This component is designed specifically for mobile viewports.</p>
    </div>
  ),
};

export const ResponsiveComponent: Story = {
  render: () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#e3f2fd',
        padding: '20px',
        borderRadius: '8px'
      }}>
        Card 1
      </div>
      <div style={{
        backgroundColor: '#f3e5f5',
        padding: '20px',
        borderRadius: '8px'
      }}>
        Card 2
      </div>
      <div style={{
        backgroundColor: '#e8f5e8',
        padding: '20px',
        borderRadius: '8px'
      }}>
        Card 3
      </div>
    </div>
  ),
};
```

## Pre-defined Viewport Collections

Storybook provides common device viewport configurations out of the box.

### Standard Device Viewports

```typescript
// Available as part of @storybook/addon-viewport
const INITIAL_VIEWPORTS = {
  iphone5: {
    name: 'iPhone 5',
    styles: { width: '320px', height: '568px' },
    type: 'mobile',
  },
  iphone6: {
    name: 'iPhone 6',
    styles: { width: '375px', height: '667px' },
    type: 'mobile',
  },
  iphone6p: {
    name: 'iPhone 6 Plus',
    styles: { width: '414px', height: '736px' },
    type: 'mobile',
  },
  iphonex: {
    name: 'iPhone X',
    styles: { width: '375px', height: '812px' },
    type: 'mobile',
  },
  ipad: {
    name: 'iPad',
    styles: { width: '768px', height: '1024px' },
    type: 'tablet',
  },
  ipadpro: {
    name: 'iPad Pro',
    styles: { width: '1024px', height: '1366px' },
    type: 'tablet',
  },
  // ... additional devices
};
```

**Usage in Configuration:**

```typescript
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';

export const parameters = {
  viewport: {
    viewports: {
      ...INITIAL_VIEWPORTS,
      // Add custom viewports
      ultrawide: {
        name: 'Ultrawide Monitor',
        styles: { width: '3440px', height: '1440px' },
        type: 'desktop',
      },
    },
  },
};
```

## Advanced Viewport Usage

### Viewport-Specific Stories

Create variants of stories optimized for different viewport sizes.

```typescript
export const DesktopLayout: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
  render: () => (
    <div style={{
      display: 'flex',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <aside style={{
        width: '250px',
        marginRight: '20px',
        backgroundColor: '#f5f5f5',
        padding: '16px',
        borderRadius: '8px'
      }}>
        <h3>Sidebar</h3>
        <nav>
          <ul>
            <li>Navigation Item 1</li>
            <li>Navigation Item 2</li>
            <li>Navigation Item 3</li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1 }}>
        <h1>Main Content Area</h1>
        <p>This layout is optimized for desktop viewing with a sidebar.</p>
      </main>
    </div>
  ),
};

export const MobileLayout: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'iphone6',
    },
  },
  render: () => (
    <div style={{ padding: '16px' }}>
      <header style={{
        backgroundColor: '#2196f3',
        color: 'white',
        padding: '12px',
        marginBottom: '16px',
        borderRadius: '4px'
      }}>
        <h1 style={{ margin: 0, fontSize: '18px' }}>Mobile Header</h1>
      </header>
      <main>
        <h2>Main Content</h2>
        <p>This layout is optimized for mobile viewing with a stacked design.</p>
      </main>
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f5f5f5',
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-around'
      }}>
        <button>Home</button>
        <button>Search</button>
        <button>Profile</button>
      </nav>
    </div>
  ),
};
```

### Responsive Behavior Testing

Test how components adapt to different screen sizes.

```typescript
export const ResponsiveGrid: Story = {
  render: () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      title: `Item ${i + 1}`,
      description: `Description for item ${i + 1}`,
    }));

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '16px',
        padding: '16px',
        // Responsive adjustments
        '@media (max-width: 768px)': {
          gridTemplateColumns: '1fr',
          gap: '12px',
          padding: '12px',
        },
      }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>
              {item.title}
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              {item.description}
            </p>
          </div>
        ))}
      </div>
    );
  },
};
```

### Viewport Integration with Controls

Combine viewport controls with component props for comprehensive testing.

```typescript
export const ViewportAwareComponent: Story = {
  args: {
    compact: false,
    showSidebar: true,
    title: 'Sample Content',
  },
  argTypes: {
    compact: {
      control: 'boolean',
      description: 'Use compact layout for smaller screens',
    },
    showSidebar: {
      control: 'boolean',
      description: 'Show/hide sidebar navigation',
    },
    title: {
      control: 'text',
      description: 'Page title',
    },
  },
  render: (args) => {
    const isMobile = window.innerWidth < 768;
    const shouldUseCompact = args.compact || isMobile;
    const shouldShowSidebar = args.showSidebar && !isMobile;

    return (
      <div style={{
        display: 'flex',
        flexDirection: shouldUseCompact ? 'column' : 'row',
        minHeight: '100vh',
      }}>
        {shouldShowSidebar && (
          <aside style={{
            width: shouldUseCompact ? '100%' : '200px',
            backgroundColor: '#f0f0f0',
            padding: '16px',
            order: shouldUseCompact ? 2 : 1,
          }}>
            <h3>Sidebar</h3>
            <ul>
              <li>Menu Item 1</li>
              <li>Menu Item 2</li>
              <li>Menu Item 3</li>
            </ul>
          </aside>
        )}
        <main style={{
          flex: 1,
          padding: '16px',
          order: shouldUseCompact ? 1 : 2,
        }}>
          <h1>{args.title}</h1>
          <p>
            Current layout: {shouldUseCompact ? 'Compact' : 'Standard'}<br />
            Sidebar: {shouldShowSidebar ? 'Visible' : 'Hidden'}
          </p>
        </main>
      </div>
    );
  },
};
```

## Configuration Examples

### Global Viewport Setup

```typescript
// .storybook/preview.js
import { INITIAL_VIEWPORTS } from '@storybook/addon-viewport';

const customViewports = {
  kindleFire2: {
    name: 'Kindle Fire 2',
    styles: {
      width: '600px',
      height: '963px',
    },
    type: 'tablet',
  },
  kindleFireHD: {
    name: 'Kindle Fire HD',
    styles: {
      width: '533px',
      height: '801px',
    },
    type: 'tablet',
  },
};

export const parameters = {
  viewport: {
    viewports: {
      ...INITIAL_VIEWPORTS,
      ...customViewports,
    },
    defaultViewport: 'responsive',
  },
};
```

### Story-Specific Viewport Restrictions

```typescript
export const TabletOnlyFeature: Story = {
  parameters: {
    viewport: {
      viewports: {
        ipad: INITIAL_VIEWPORTS.ipad,
        ipadpro: INITIAL_VIEWPORTS.ipadpro,
      },
      defaultViewport: 'ipad',
    },
  },
  render: () => (
    <div>This feature is only available on tablet devices</div>
  ),
};
```
