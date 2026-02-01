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

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 14+ | App Router, Server Components |
| UI Components | shadcn/ui | Radix primitives + Tailwind CSS |
| Design System | Storybook | Component documentation and testing |
| E2E Testing | Playwright | Browser-based automated tests |

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

```mermaid
flowchart TB
    subgraph Header["Header Bar"]
        Logo["[Logo] Shep AI"]
        Settings["[Settings] [?]"]
    end

    subgraph Main["Main Area"]
        subgraph Sidebar["Sidebar"]
            direction TB
            FeaturesTitle["FEATURES"]
            F1["□ Feature 1"]
            F2["□ Feature 2"]
            F3["□ Feature 3"]
            NewBtn["[+ New Feature]"]
        end
        subgraph Content["Content Area"]
            MainContent["MAIN CONTENT AREA"]
        end
    end

    subgraph Footer["Status Bar"]
        Status["Status: Ready | Analysis: Up to date | Server: Running"]
    end

    Header --> Main
    Main --> Footer

    style Header fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style Main fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style Sidebar fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style Content fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style Footer fill:#f1f5f9,stroke:#94a3b8,color:#475569
    style Logo fill:#ffffff,stroke:#94a3b8,color:#1e293b
    style Settings fill:#ffffff,stroke:#94a3b8,color:#1e293b
    style FeaturesTitle fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style F1 fill:#ffffff,stroke:#94a3b8,color:#374151
    style F2 fill:#ffffff,stroke:#94a3b8,color:#374151
    style F3 fill:#ffffff,stroke:#94a3b8,color:#374151
    style NewBtn fill:#d1fae5,stroke:#10b981,color:#064e3b
    style MainContent fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style Status fill:#f1f5f9,stroke:#94a3b8,color:#475569
```

## Feature Workflow

### Creating a Feature

1. Click **[+ New Feature]** in the sidebar
2. The AI greets you with contextual options:

```mermaid
flowchart TB
    subgraph Dialog["New Feature Dialog"]
        direction TB
        subgraph DialogHeader["Header"]
            Title["New Feature"]
        end
        subgraph DialogContent["Content"]
            direction TB
            Intro["Based on your codebase, here are some suggestions:"]
            Opt1["○ Add user authentication"]
            Opt2["○ Implement API caching"]
            Opt3["○ Add comprehensive testing"]
            Opt4["○ Other: [________________]"]
        end
        subgraph DialogFooter["Footer"]
            Cancel["[Cancel]"]
            Continue["[Continue]"]
        end
    end

    DialogHeader --> DialogContent
    DialogContent --> DialogFooter

    style Dialog fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style DialogHeader fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style DialogContent fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style DialogFooter fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style Title fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style Intro fill:#ffffff,stroke:#94a3b8,color:#374151
    style Opt1 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Opt2 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Opt3 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Opt4 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Cancel fill:#f1f5f9,stroke:#64748b,color:#374151
    style Continue fill:#d1fae5,stroke:#10b981,color:#064e3b
```

3. Select or describe your feature
4. Continue to requirements gathering

### Requirements Gathering

The chat interface guides you through requirements:

```mermaid
flowchart TB
    subgraph ChatView["Requirements Gathering Chat"]
        direction TB
        subgraph ChatHeader["Header"]
            FeatureName["Feature: User Authentication"]
            Phase["Phase: Requirements"]
        end
        subgraph ChatArea["Chat Area"]
            direction TB
            ShepMsg["Shep: What authentication method would you like?"]
            subgraph Options["Options"]
                Opt1["○ Email/password"]
                Opt2["○ OAuth - Google, GitHub"]
                Opt3["○ Magic links"]
                Opt4["○ Multiple methods"]
            end
            UserInput["You: [Type or select...]"]
        end
        subgraph ChatFooter["Footer"]
            ReqCount["Requirements gathered: 3"]
            SaveBtn["[Save Draft]"]
            DoneBtn["[Done]"]
        end
    end

    ChatHeader --> ChatArea
    ChatArea --> ChatFooter

    style ChatView fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style ChatHeader fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style ChatArea fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style Options fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style ChatFooter fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style FeatureName fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style Phase fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style ShepMsg fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    style Opt1 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Opt2 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Opt3 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Opt4 fill:#ffffff,stroke:#94a3b8,color:#374151
    style UserInput fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style ReqCount fill:#f1f5f9,stroke:#94a3b8,color:#475569
    style SaveBtn fill:#f1f5f9,stroke:#64748b,color:#374151
    style DoneBtn fill:#d1fae5,stroke:#10b981,color:#064e3b
```

Chat features:
- Click options to select
- Type custom responses
- Review gathered requirements on the side
- Save drafts to continue later

### Plan View

After requirements, view the generated plan:

```mermaid
flowchart TB
    subgraph PlanView["Plan View"]
        direction TB
        subgraph PlanHeader["Header"]
            Title["User Authentication"]
            ReqBtn["[Requirements]"]
            Preview["Preview"]
        end
        subgraph EpicInfo["Epic Summary"]
            EpicStats["EPIC: 5 stories - 25 subtasks"]
        end
        subgraph PlanContent["Plan Content"]
            direction TB
            Epic["Implement OAuth Authentication"]
            EpicDesc["Introduce OAuth support with Google and GitHub..."]
            subgraph Story1["STORY: Setup OAuth Provider Config - 3 tasks"]
                T1["□ Create provider configuration file"]
                T2["□ Add environment variable handling"]
                T3["□ Implement provider factory"]
            end
            subgraph Story2["STORY: Implement Callback Handlers - 4 tasks"]
                T4["□ Create OAuth callback route"]
                T5["□ Implement token exchange"]
                T6["□ Handle user creation/linking"]
                T7["□ Add error handling"]
            end
        end
        subgraph PlanTabs["Tabs"]
            Tab1["TICKETS 25"]
            Tab2["DOCUMENTATION 3"]
            Tab3["REQUIREMENTS 8"]
        end
    end

    PlanHeader --> EpicInfo
    EpicInfo --> PlanContent
    Epic --> EpicDesc
    EpicDesc --> Story1
    Story1 --> Story2
    PlanContent --> PlanTabs

    style PlanView fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style PlanHeader fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style EpicInfo fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style PlanContent fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style Story1 fill:#d1fae5,stroke:#10b981,color:#064e3b
    style Story2 fill:#d1fae5,stroke:#10b981,color:#064e3b
    style PlanTabs fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style Title fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style ReqBtn fill:#f1f5f9,stroke:#64748b,color:#374151
    style Preview fill:#f1f5f9,stroke:#64748b,color:#374151
    style EpicStats fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style Epic fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style EpicDesc fill:#ffffff,stroke:#94a3b8,color:#374151
    style T1 fill:#ffffff,stroke:#94a3b8,color:#374151
    style T2 fill:#ffffff,stroke:#94a3b8,color:#374151
    style T3 fill:#ffffff,stroke:#94a3b8,color:#374151
    style T4 fill:#ffffff,stroke:#94a3b8,color:#374151
    style T5 fill:#ffffff,stroke:#94a3b8,color:#374151
    style T6 fill:#ffffff,stroke:#94a3b8,color:#374151
    style T7 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Tab1 fill:#d1fae5,stroke:#10b981,color:#064e3b
    style Tab2 fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style Tab3 fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
```

#### Tabs

| Tab | Content |
|-----|---------|
| TICKETS | Tasks and action items |
| DOCUMENTATION | Generated artifacts (PRD, RFC, etc.) |
| REQUIREMENTS | Gathered requirements list |

#### Actions

- **Expand/Collapse** stories to see tasks
- **Click tasks** to view details
- **Edit** tasks inline
- **Reorder** by dragging
- **Add** new tasks or action items

### Implementation View

During implementation, track progress:

```mermaid
flowchart TB
    subgraph ImplView["Implementation View"]
        direction TB
        subgraph ImplHeader["Header"]
            Title["User Authentication"]
            PhaseInfo["Phase: Implementation | Progress: 40%"]
        end
        subgraph ProgressSection["Progress"]
            ProgressBar["[================....................] 10/25 tasks"]
        end
        subgraph CurrentTask["Currently Executing"]
            TaskTitle["TASK: Implement token exchange"]
            TaskAction["Creating src/services/oauth.ts"]
            TaskDetail["Adding exchangeToken function..."]
        end
        subgraph ActivityLog["Recent Activity"]
            A1["Completed: Created src/routes/auth.ts"]
            A2["Completed: Added OAuth callback route"]
            A3["Completed: Configured environment variables"]
        end
        subgraph ImplFooter["Controls"]
            PauseBtn["[Pause]"]
            ViewBtn["[View Changes]"]
            CancelBtn["[Cancel]"]
        end
    end

    ImplHeader --> ProgressSection
    ProgressSection --> CurrentTask
    CurrentTask --> ActivityLog
    ActivityLog --> ImplFooter

    style ImplView fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style ImplHeader fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style ProgressSection fill:#d1fae5,stroke:#10b981,color:#064e3b
    style CurrentTask fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style ActivityLog fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style ImplFooter fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style Title fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style PhaseInfo fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style ProgressBar fill:#d1fae5,stroke:#10b981,color:#064e3b
    style TaskTitle fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style TaskAction fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style TaskDetail fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style A1 fill:#d1fae5,stroke:#10b981,color:#064e3b
    style A2 fill:#d1fae5,stroke:#10b981,color:#064e3b
    style A3 fill:#d1fae5,stroke:#10b981,color:#064e3b
    style PauseBtn fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style ViewBtn fill:#f1f5f9,stroke:#64748b,color:#374151
    style CancelBtn fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
```

#### Controls

| Button | Action |
|--------|--------|
| Pause | Pause execution after current task |
| View Changes | Open diff viewer |
| Cancel | Stop execution (requires confirmation) |

### Artifact Viewer

View and edit generated documentation:

```mermaid
flowchart TB
    subgraph ArtifactView["Artifact Viewer"]
        direction TB
        subgraph ArtifactHeader["Header"]
            DocIcon["Product Requirements Document"]
        end
        subgraph ArtifactContent["Document Content"]
            direction TB
            DocTitle["# PRD: User Authentication"]
            subgraph ProblemSection["Problem Statement"]
                Problem["Users currently cannot securely access their accounts..."]
            end
            subgraph StoriesSection["User Stories"]
                Story1["As a user, I want to log in with Google so that..."]
                Story2["As a user, I want to link my GitHub account..."]
            end
            subgraph CriteriaSection["Acceptance Criteria"]
                AC1["[ ] Users can sign in with Google OAuth"]
                AC2["[ ] Users can sign in with GitHub OAuth"]
                AC3["[ ] Users can link multiple providers"]
            end
        end
        subgraph ArtifactFooter["Actions"]
            EditBtn["[Edit]"]
            ExportBtn["[Export]"]
            RegenBtn["[Regenerate]"]
        end
    end

    ArtifactHeader --> ArtifactContent
    DocTitle --> ProblemSection
    ProblemSection --> StoriesSection
    StoriesSection --> CriteriaSection
    ArtifactContent --> ArtifactFooter

    style ArtifactView fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style ArtifactHeader fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style ArtifactContent fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style ProblemSection fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style StoriesSection fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style CriteriaSection fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style ArtifactFooter fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style DocIcon fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style DocTitle fill:#ffffff,stroke:#94a3b8,color:#1e293b
    style Problem fill:#f8fafc,stroke:#94a3b8,color:#374151
    style Story1 fill:#f8fafc,stroke:#94a3b8,color:#374151
    style Story2 fill:#f8fafc,stroke:#94a3b8,color:#374151
    style AC1 fill:#ffffff,stroke:#94a3b8,color:#374151
    style AC2 fill:#ffffff,stroke:#94a3b8,color:#374151
    style AC3 fill:#ffffff,stroke:#94a3b8,color:#374151
    style EditBtn fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style ExportBtn fill:#f1f5f9,stroke:#64748b,color:#374151
    style RegenBtn fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
```

Features:
- Markdown rendering
- Inline editing
- Export to file
- Regenerate with AI

## Settings

Access via gear icon:

```mermaid
flowchart TB
    subgraph SettingsModal["Settings Modal"]
        direction TB
        subgraph SettingsHeader["Header"]
            Title["Settings"]
            CloseBtn["[x]"]
        end
        subgraph SettingsContent["Settings Options"]
            direction TB
            subgraph ThemeSection["Theme"]
                ThemeOpts["○ Light  ○ Dark  ● System"]
            end
            subgraph ImplSection["Implementation"]
                Impl1["[x] Require approval before each task"]
                Impl2["[ ] Auto-commit changes"]
            end
            subgraph ServerSection["Server"]
                PortSetting["Port: [3030]"]
            end
            subgraph AdvancedSection["Advanced"]
                AdvBtn1["[View Logs]"]
                AdvBtn2["[Clear Cache]"]
                AdvBtn3["[Reset Config]"]
            end
        end
        subgraph SettingsFooter["Actions"]
            CancelBtn["[Cancel]"]
            SaveBtn["[Save]"]
        end
    end

    SettingsHeader --> SettingsContent
    ThemeSection --> ImplSection
    ImplSection --> ServerSection
    ServerSection --> AdvancedSection
    SettingsContent --> SettingsFooter

    style SettingsModal fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style SettingsHeader fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style SettingsContent fill:#ffffff,stroke:#e2e8f0,color:#1e293b
    style ThemeSection fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style ImplSection fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style ServerSection fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style AdvancedSection fill:#f8fafc,stroke:#94a3b8,color:#1e293b
    style SettingsFooter fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style Title fill:#f1f5f9,stroke:#64748b,color:#1e293b
    style CloseBtn fill:#f1f5f9,stroke:#64748b,color:#374151
    style ThemeOpts fill:#ffffff,stroke:#94a3b8,color:#374151
    style Impl1 fill:#ffffff,stroke:#94a3b8,color:#374151
    style Impl2 fill:#ffffff,stroke:#94a3b8,color:#374151
    style PortSetting fill:#ffffff,stroke:#94a3b8,color:#374151
    style AdvBtn1 fill:#f1f5f9,stroke:#64748b,color:#374151
    style AdvBtn2 fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style AdvBtn3 fill:#fee2e2,stroke:#ef4444,color:#7f1d1d
    style CancelBtn fill:#f1f5f9,stroke:#64748b,color:#374151
    style SaveBtn fill:#d1fae5,stroke:#10b981,color:#064e3b
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New feature |
| `Ctrl/Cmd + S` | Save current |
| `Ctrl/Cmd + Enter` | Submit in chat |
| `Escape` | Close modal/cancel |
| `?` | Show all shortcuts |

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
