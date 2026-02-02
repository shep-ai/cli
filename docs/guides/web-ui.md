# Web UI Guide

Guide to using Shep's browser-based interface.

## Overview

The web UI provides a visual interface for:

- Creating and managing features
- Interactive requirements gathering
- Plan visualization and editing
- Implementation progress tracking
- Artifact viewing and editing

## Technology Stack

| Component     | Technology  | Purpose                             |
| ------------- | ----------- | ----------------------------------- |
| Framework     | Next.js 14+ | App Router, Server Components       |
| UI Components | shadcn/ui   | Radix primitives + Tailwind CSS     |
| Design System | Storybook   | Component documentation and testing |
| E2E Testing   | Playwright  | Browser-based automated tests       |

The Web UI is built with modern React patterns:

- **Server Components** for data fetching and initial renders
- **Client Components** for interactivity (chat, real-time updates)
- **shadcn/ui** for accessible, customizable UI primitives
- **Tailwind CSS** for styling with design tokens

## Accessing the UI

Start Shep and the UI opens automatically:

```bash
shep
```

Default URL: `http://localhost:3030/`

To start without opening browser:

```bash
shep --no-browser
```

## Interface Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo] Shep AI                                   [Settings] [?]       │
├──────────────────────┬─────────────────────────────────────────────────┤
│                      │                                                   │
│  FEATURES            │                                                   │
│  ────────────────    │        MAIN CONTENT AREA                          │
│  □ Feature 1         │                                                   │
│  □ Feature 2         │                                                   │
│  □ Feature 3         │                                                   │
│                      │                                                   │
│  [+ New Feature]     │                                                   │
│                      │                                                   │
├──────────────────────┴─────────────────────────────────────────────────┤
│ Status: Ready | Analysis: Up to date | Server: Running                 │
└─────────────────────────────────────────────────────────────────────────┘
```

## Feature Workflow

### Creating a Feature

1. Click **[+ New Feature]** in the sidebar
2. The AI greets you with contextual options:

```
┌────────────────────────────────────────────────┐
│  New Feature                                   │
├────────────────────────────────────────────────┤
│                                                │
│  Based on your codebase, here are some        │
│  suggestions:                                 │
│                                                │
│  ○ Add user authentication                    │
│  ○ Implement API caching                      │
│  ○ Add comprehensive testing                  │
│  ○ Other: [________________]                  │
│                                                │
├────────────────────────────────────────────────┤
│  [Cancel]                          [Continue] │
└────────────────────────────────────────────────┘
```

3. Select or describe your feature
4. Continue to requirements gathering

### Requirements Gathering

The chat interface guides you through requirements:

```
┌─────────────────────────────────────────────────────────┐
│ Feature: User Authentication | Phase: Requirements      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Shep: What authentication method would you like?       │
│                                                         │
│   Options:                                              │
│   ○ Email/password                                      │
│   ○ OAuth - Google, GitHub                             │
│   ○ Magic links                                         │
│   ○ Multiple methods                                    │
│                                                         │
│ You: [Type or select...]                               │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Requirements gathered: 3                                │
│ [Save Draft]                              [Done]       │
└─────────────────────────────────────────────────────────┘
```

Chat features:

- Click options to select
- Type custom responses
- Review gathered requirements on the side
- Save drafts to continue later

### Plan View

After requirements, view the generated plan:

```
┌──────────────────────────────────────────────────────────────────┐
│ User Authentication     [Requirements]  Preview                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ EPIC: 5 stories - 25 subtasks                                   │
│                                                                  │
│ ┌─ Implement OAuth Authentication ────────────────────────────┐ │
│ │ Introduce OAuth support with Google and GitHub...          │ │
│ │                                                              │ │
│ │ ▼ STORY: Setup OAuth Provider Config - 3 tasks             │ │
│ │   □ Create provider configuration file                      │ │
│ │   □ Add environment variable handling                       │ │
│ │   □ Implement provider factory                              │ │
│ │                                                              │ │
│ │ ▼ STORY: Implement Callback Handlers - 4 tasks             │ │
│ │   □ Create OAuth callback route                             │ │
│ │   □ Implement token exchange                                │ │
│ │   □ Handle user creation/linking                            │ │
│ │   □ Add error handling                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│ TICKETS 25  |  DOCUMENTATION 3  |  REQUIREMENTS 8                │
└──────────────────────────────────────────────────────────────────┘
```

#### Tabs

| Tab           | Content                              |
| ------------- | ------------------------------------ |
| TICKETS       | Tasks and action items               |
| DOCUMENTATION | Generated artifacts (PRD, RFC, etc.) |
| REQUIREMENTS  | Gathered requirements list           |

#### Actions

- **Expand/Collapse** stories to see tasks
- **Click tasks** to view details
- **Edit** tasks inline
- **Reorder** by dragging
- **Add** new tasks or action items

### Implementation View

During implementation, track progress:

```
┌────────────────────────────────────────────────────────────┐
│ User Authentication                                        │
│ Phase: Implementation | Progress: 40%                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ Progress: [================....................] 10/25     │
│                                                            │
│ Currently Executing:                                       │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ TASK: Implement token exchange                         │ │
│ │ Creating src/services/oauth.ts                         │ │
│ │ Adding exchangeToken function...                        │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Recent Activity:                                           │
│ ✓ Completed: Created src/routes/auth.ts                   │
│ ✓ Completed: Added OAuth callback route                   │
│ ✓ Completed: Configured environment variables             │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [Pause]             [View Changes]             [Cancel]   │
└────────────────────────────────────────────────────────────┘
```

#### Controls

| Button       | Action                                 |
| ------------ | -------------------------------------- |
| Pause        | Pause execution after current task     |
| View Changes | Open diff viewer                       |
| Cancel       | Stop execution (requires confirmation) |

### Artifact Viewer

View and edit generated documentation:

```
┌───────────────────────────────────────────────────────────┐
│ Product Requirements Document                             │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ # PRD: User Authentication                              │
│                                                           │
│ Problem Statement                                         │
│ ───────────────────                                       │
│ Users currently cannot securely access their accounts... │
│                                                           │
│ User Stories                                              │
│ ──────────────                                            │
│ As a user, I want to log in with Google so that...       │
│ As a user, I want to link my GitHub account...           │
│                                                           │
│ Acceptance Criteria                                       │
│ ──────────────────────                                    │
│ [ ] Users can sign in with Google OAuth                  │
│ [ ] Users can sign in with GitHub OAuth                  │
│ [ ] Users can link multiple providers                    │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ [Edit]                [Export]        [Regenerate]       │
└───────────────────────────────────────────────────────────┘
```

Features:

- Markdown rendering
- Inline editing
- Export to file
- Regenerate with AI

## Settings

Access via gear icon:

```
┌──────────────────────────────────────────────────┐
│ Settings                                    [x] │
├──────────────────────────────────────────────────┤
│                                                  │
│ Theme                                            │
│ ○ Light  ○ Dark  ● System                        │
│                                                  │
│ Implementation                                   │
│ [x] Require approval before each task            │
│ [ ] Auto-commit changes                          │
│                                                  │
│ Server                                           │
│ Port: [3030]                                     │
│                                                  │
│ Advanced                                         │
│ [View Logs]  [Clear Cache]  [Reset Config]       │
│                                                  │
├──────────────────────────────────────────────────┤
│ [Cancel]                              [Save]    │
└──────────────────────────────────────────────────┘
```

## Keyboard Shortcuts

| Shortcut           | Action             |
| ------------------ | ------------------ |
| `Ctrl/Cmd + N`     | New feature        |
| `Ctrl/Cmd + S`     | Save current       |
| `Ctrl/Cmd + Enter` | Submit in chat     |
| `Escape`           | Close modal/cancel |
| `?`                | Show all shortcuts |

## Responsive Design

The UI adapts to screen size:

- **Desktop** (>1200px): Full sidebar + content
- **Tablet** (768-1200px): Collapsible sidebar
- **Mobile** (<768px): Bottom navigation

## Development

### Running Locally

```bash
# Start the web UI in development mode
pnpm web:dev

# Build for production
pnpm web:build

# Run E2E tests
pnpm test:e2e
```

### Storybook

View and develop components in isolation:

```bash
# Start Storybook dev server
pnpm storybook

# Build Storybook for deployment
pnpm storybook:build
```

Storybook includes:

- All shadcn/ui component variants
- Feature-specific components
- Interactive documentation
- Visual regression testing

### Project Structure

```
src/presentation/web/
├── app/                     # Next.js App Router
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── features/           # Feature pages
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── requirements/
│   │   └── new/
│   └── settings/
├── components/
│   ├── ui/                 # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── features/           # Feature components
│   │   ├── feature-card.tsx
│   │   └── feature-list.tsx
│   ├── chat/              # Chat components
│   │   ├── chat-messages.tsx
│   │   └── chat-input.tsx
│   └── layout/            # Layout components
│       ├── sidebar.tsx
│       └── header.tsx
├── lib/                   # Utilities
│   └── utils.ts
└── stories/               # Storybook stories
    ├── Button.stories.tsx
    └── FeatureCard.stories.tsx
```

---

## Maintaining This Document

**Update when:**

- UI layout changes
- New features are added
- Keyboard shortcuts change
- New views are introduced
- Component library updates

**Related docs:**

- [getting-started.md](./getting-started.md) - First-time setup
- [cli-commands.md](./cli-commands.md) - Server commands
- [../development/testing.md](../development/testing.md) - E2E testing guide
