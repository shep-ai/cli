# Element Highlighting

Visual highlighting system for emphasizing specific DOM elements within stories, useful for documentation, interactive tutorials, and drawing attention to specific parts of the UI during presentations or testing.

## Capabilities

### Highlight Events

Event constants for controlling element highlighting behavior through Storybook's event system.

```typescript { .api }
/**
 * Event identifiers for highlight functionality
 */
const HIGHLIGHT = 'storybook/highlight/add';
const REMOVE_HIGHLIGHT = 'storybook/highlight/remove';
const RESET_HIGHLIGHT = 'storybook/highlight/reset';
const SCROLL_INTO_VIEW = 'storybook/highlight/scroll-into-view';
```

**Usage Example:**

```typescript
import {
  HIGHLIGHT,
  REMOVE_HIGHLIGHT,
  RESET_HIGHLIGHT
} from "storybook/highlight";
import { useChannel } from "storybook/preview-api";

export const HighlightableComponent: Story = {
  render: () => {
    const emit = useChannel({});

    const highlightElement = () => {
      emit(HIGHLIGHT, {
        elements: ['.highlight-target'],
        color: '#FF6B6B',
        style: 'solid'
      });
    };

    const removeHighlight = () => {
      emit(REMOVE_HIGHLIGHT);
    };

    const resetHighlights = () => {
      emit(RESET_HIGHLIGHT);
    };

    return (
      <div>
        <button onClick={highlightElement}>Highlight Element</button>
        <button onClick={removeHighlight}>Remove Highlight</button>
        <button onClick={resetHighlights}>Reset All</button>

        <div className="highlight-target" style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #ccc'
        }}>
          This element can be highlighted
        </div>
      </div>
    );
  },
};
```

## Highlight Configuration Types

### Highlight Options

Configuration interface for customizing highlight appearance and behavior.

```typescript { .api }
interface HighlightOptions {
  /** Elements to highlight - CSS selectors or HTMLElement instances */
  elements: string[] | HTMLElement[];
  /** Highlight color (default: theme primary color) */
  color?: string;
  /** Border style for highlight outline */
  style?: 'solid' | 'dashed' | 'dotted';
}
```

### Context Menu Integration

Configuration for highlight-related context menu items.

```typescript { .api }
interface HighlightMenuItem {
  /** Display title for the menu item */
  title: string;
  /** Click handler for the menu item */
  onClick: () => void;
}
```

### Click Event Details

Event data structure for highlight-related click interactions.

```typescript { .api }
interface ClickEventDetails {
  /** The element that was clicked */
  element: HTMLElement;
  /** The actual event target (may be child of element) */
  target: HTMLElement;
}
```

## Integration with Storybook Addons

### Using with Actions Addon

```typescript
import { action } from "storybook/actions";
import { HIGHLIGHT, REMOVE_HIGHLIGHT } from "storybook/highlight";
import { useChannel } from "storybook/preview-api";

export const InteractiveHighlighting: Story = {
  render: () => {
    const emit = useChannel({});
    const logAction = action("highlight-action");

    const highlightWithAction = (selector: string) => {
      logAction(`Highlighting: ${selector}`);
      emit(HIGHLIGHT, {
        elements: [selector],
        color: '#4ECDC4',
        style: 'dashed'
      });
    };

    return (
      <div>
        <button onClick={() => highlightWithAction('.card')}>
          Highlight Card
        </button>
        <button onClick={() => highlightWithAction('.button')}>
          Highlight Button
        </button>

        <div className="card" style={{
          padding: '16px',
          margin: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          <h3>Sample Card</h3>
          <button className="button">Sample Button</button>
        </div>
      </div>
    );
  },
};
```

### Sequential Highlighting

```typescript
import { HIGHLIGHT, SCROLL_INTO_VIEW } from "storybook/highlight";
import { useChannel } from "storybook/preview-api";
import { useState, useEffect } from "react";

export const TutorialHighlighting: Story = {
  render: () => {
    const emit = useChannel({});
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
      { selector: '.step-1', text: 'First, fill in your name' },
      { selector: '.step-2', text: 'Then, enter your email' },
      { selector: '.step-3', text: 'Finally, click submit' },
    ];

    useEffect(() => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];

        // Scroll element into view first
        emit(SCROLL_INTO_VIEW, { elements: [step.selector] });

        // Then highlight it
        setTimeout(() => {
          emit(HIGHLIGHT, {
            elements: [step.selector],
            color: '#FF6B6B',
            style: 'solid'
          });
        }, 500);
      }
    }, [currentStep]);

    return (
      <div>
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            Previous
          </button>
          <span style={{ margin: '0 10px' }}>
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
          >
            Next
          </button>
        </div>

        {currentStep < steps.length && (
          <p><strong>{steps[currentStep].text}</strong></p>
        )}

        <form style={{ maxWidth: '400px' }}>
          <div className="step-1" style={{ marginBottom: '16px' }}>
            <label htmlFor="name">Name:</label>
            <input type="text" id="name" style={{ marginLeft: '8px' }} />
          </div>

          <div className="step-2" style={{ marginBottom: '16px' }}>
            <label htmlFor="email">Email:</label>
            <input type="email" id="email" style={{ marginLeft: '8px' }} />
          </div>

          <div className="step-3">
            <button type="submit">Submit</button>
          </div>
        </form>
      </div>
    );
  },
};
```

### Conditional Highlighting

```typescript
import { HIGHLIGHT, REMOVE_HIGHLIGHT } from "storybook/highlight";
import { useChannel, useArgs } from "storybook/preview-api";
import { useEffect } from "react";

export const ConditionalHighlighting: Story = {
  args: {
    showErrors: false,
    highlightMode: 'none',
  },
  argTypes: {
    showErrors: {
      control: 'boolean',
      description: 'Show validation errors'
    },
    highlightMode: {
      control: 'select',
      options: ['none', 'errors', 'required', 'all'],
      description: 'Elements to highlight'
    },
  },
  render: (args) => {
    const emit = useChannel({});

    useEffect(() => {
      // Clear any existing highlights
      emit(REMOVE_HIGHLIGHT);

      // Apply highlights based on mode
      switch (args.highlightMode) {
        case 'errors':
          if (args.showErrors) {
            emit(HIGHLIGHT, {
              elements: ['.error'],
              color: '#EF4444',
              style: 'solid'
            });
          }
          break;

        case 'required':
          emit(HIGHLIGHT, {
            elements: ['[required]'],
            color: '#F59E0B',
            style: 'dashed'
          });
          break;

        case 'all':
          emit(HIGHLIGHT, {
            elements: ['input', 'button'],
            color: '#10B981',
            style: 'dotted'
          });
          break;
      }
    }, [args.showErrors, args.highlightMode]);

    return (
      <form style={{ maxWidth: '400px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="name">Name (required):</label>
          <input type="text" id="name" required />
          {args.showErrors && (
            <div className="error" style={{ color: '#EF4444', fontSize: '14px' }}>
              Name is required
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="email">Email (required):</label>
          <input type="email" id="email" required />
          {args.showErrors && (
            <div className="error" style={{ color: '#EF4444', fontSize: '14px' }}>
              Please enter a valid email
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="phone">Phone (optional):</label>
          <input type="tel" id="phone" />
        </div>

        <button type="submit">Submit</button>
      </form>
    );
  },
};
```

## Best Practices

### Performance Considerations

- Use CSS selectors instead of HTMLElement references when possible for better performance
- Debounce rapid highlight changes to avoid excessive DOM manipulation
- Clean up highlights when components unmount or stories change

### Accessibility

- Ensure highlighted elements remain accessible to screen readers
- Don't rely solely on color for important information
- Provide alternative ways to identify highlighted elements

### Visual Design

- Choose highlight colors that work well with your component themes
- Use consistent highlight styles across related stories
- Consider animation duration and easing for smooth transitions

**Example of Accessible Highlighting:**

```typescript
export const AccessibleHighlighting: Story = {
  render: () => {
    const emit = useChannel({});

    const highlightWithAnnouncement = (selector: string, description: string) => {
      // Highlight the element
      emit(HIGHLIGHT, {
        elements: [selector],
        color: '#3B82F6',
        style: 'solid'
      });

      // Announce to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.style.position = 'absolute';
      announcement.style.left = '-10000px';
      announcement.textContent = `Highlighted: ${description}`;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    };

    return (
      <div>
        <button
          onClick={() => highlightWithAnnouncement('.important', 'Important section')}
        >
          Highlight Important Section
        </button>

        <div
          className="important"
          style={{
            padding: '20px',
            margin: '20px',
            border: '1px solid #ccc'
          }}
          role="region"
          aria-label="Important information"
        >
          This is an important section that can be highlighted
        </div>
      </div>
    );
  },
};
```
