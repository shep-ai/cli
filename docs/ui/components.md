# Component Catalog

Reference for all available UI components in the Shep AI web interface.

## Importing Components

```typescript
// UI primitives (shadcn/ui)
import { Button, Card, Dialog, Input } from '@/components/ui';

// Feature components
import { ThemeToggle } from '@/components/features';
```

## UI Components (shadcn/ui)

### Button

Action buttons with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui';

<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

<Button disabled>Disabled</Button>
<Button asChild><a href="/link">As Link</a></Button>
```

| Prop      | Values                                               | Default   |
| --------- | ---------------------------------------------------- | --------- |
| `variant` | `default`, `destructive`, `outline`, `ghost`, `link` | `default` |
| `size`    | `default`, `sm`, `lg`, `icon`                        | `default` |

### Card

Container for grouped content with optional header and footer.

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>Main content here</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

### Dialog

Modal dialogs for focused interactions.

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Description of the dialog purpose.</DialogDescription>
    </DialogHeader>
    <div>Dialog body content</div>
    <DialogFooter>
      <DialogClose asChild>
        <Button variant="outline">Cancel</Button>
      </DialogClose>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

### Input

Text input fields for forms.

```tsx
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="you@example.com" />
</div>

<Input disabled placeholder="Disabled input" />
```

### Label

Accessible form field labels.

```tsx
import { Label } from '@/components/ui';

<Label htmlFor="name">Name</Label>;
```

### Select

Dropdown selection component.

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
    <SelectItem value="option3">Option 3</SelectItem>
  </SelectContent>
</Select>;
```

### Tabs

Tabbed content navigation.

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content for tab 1</TabsContent>
  <TabsContent value="tab2">Content for tab 2</TabsContent>
</Tabs>;
```

### Accordion

Collapsible content sections.

```tsx
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui';

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>Content for section 1</AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Section 2</AccordionTrigger>
    <AccordionContent>Content for section 2</AccordionContent>
  </AccordionItem>
</Accordion>;
```

### Alert

Feedback messages with semantic variants.

```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui';

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>This is an informational alert.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

### Badge

Status indicators and labels.

```tsx
import { Badge } from '@/components/ui';

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>
```

### Popover

Floating content panels.

```tsx
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui';

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>Popover content here</PopoverContent>
</Popover>;
```

### Sonner (Toast)

Toast notifications.

```tsx
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';

// In your layout
<Toaster />;

// To show a toast
toast('Event has been created');
toast.success('Successfully saved!');
toast.error('Something went wrong');
toast.warning('Please review your input');
```

## Feature Components

### ThemeToggle

Toggle between light and dark modes.

```tsx
import { ThemeToggle } from '@/components/features';

<ThemeToggle />;
```

Renders a ghost button with sun/moon icons that toggles the theme.

## Adding Components

### Add shadcn/ui Component

```bash
pnpm dlx shadcn@latest add [component-name]
```

Available components: https://ui.shadcn.com/docs/components

### Create Feature Component

1. Create folder: `components/features/[name]/`
2. Add files:
   - `[name].tsx` - Component implementation
   - `[name].stories.tsx` - Storybook stories
   - `index.ts` - Barrel export
3. Export from `components/features/index.ts`

## Storybook

View all components with interactive examples:

```bash
pnpm dev:storybook
```

Opens at http://localhost:6006 with:

- All component variants
- Interactive controls
- Accessibility info
- Code examples
