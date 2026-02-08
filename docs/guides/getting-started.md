# Getting Started

This guide walks you through installing Shep AI CLI and creating your first feature.

## Prerequisites

- **Node.js** 18 or higher
- **pnpm** 8 or higher (`npm install -g pnpm`)
- A repository to work with
- Access to at least one supported AI agent provider

## Installation

Install Shep globally via pnpm:

```bash
pnpm add -g @shepai/cli
```

Or with npm:

```bash
npm install -g @shepai/cli
```

Verify installation:

```bash
shep --version
```

## First Run

Navigate to your project directory and run Shep:

```bash
cd my-awesome-repository
shep
```

### Initial Setup Wizard

On first run, Shep launches a TUI wizard to configure your agent provider.

#### Step 1: Select Agent Provider

```
┌─────────────────────────────────────────────┐
│      Shep AI CLI Setup                      │
├─────────────────────────────────────────────┤
│                                             │
│  Welcome to Shep!                           │
│  Select your AI agent provider:             │
│                                             │
│  ● Claude Code (Recommended)                │
│  ○ Cursor                                   │
│  ○ Gemini CLI                               │
│  ○ GitHub Copilot                           │
│  ○ Codeium                                  │
│  ○ Amazon Q Developer                       │
│  ○ Cody (Sourcegraph)                       │
│  ○ Tabnine                                  │
│                                             │
└─────────────────────────────────────────────┘
```

> **Note:** Each provider has different capabilities and authentication methods. Claude Code is recommended for full autonomous SDLC support.

#### Step 2: Authentication

After selecting a provider, Shep prompts for authentication:

```
┌─────────────────────────────────────────────┐
│      Shep AI CLI Setup                      │
├─────────────────────────────────────────────┤
│                                             │
│  Configure Claude Code authentication       │
│                                             │
│  How would you like to authenticate?        │
│                                             │
│  ○ Use existing session                     │
│  ○ Set up new token                         │
│                                             │
└─────────────────────────────────────────────┘
```

> **Note:** Authentication options vary by provider. Some support session reuse, others require API keys or OAuth.

#### Option 1: Use Existing Session

If you're already logged into your selected provider, Shep can use that session:

1. Select "Use existing session"
2. Shep detects your existing authentication
3. Setup complete

#### Option 2: Set Up New Token

To use a new API token:

1. Select "Set up new token"
2. Enter your API key for the selected provider
3. Shep validates and stores the token securely

### Repository Analysis

After authentication, Shep analyzes your repository:

```
Analyzing Repository... [████████░░░░░░░░] (75%)

✓ Architecture analysis complete
✓ Dependency analysis complete
● Pattern detection in progress...
○ Convention extraction pending
```

> **Note:** Progress indicators: ✓ = complete, ● = in progress, ○ = pending.

This analysis runs once per repository and is cached for future sessions.

### Web UI Launch

After analysis completes, start the web UI:

```bash
shep ui
```

```
✓ Web server started

  Open in your browser:
  http://localhost:4050/

  Press Ctrl+C to stop
```

## Creating Your First Feature

### 1. Open the Web UI

Navigate to `http://localhost:4050/` in your browser.

### 2. Start a New Feature

The AI greets you with contextual options based on your repository:

```
┌──────────────────────────────────────────────┐
│          Welcome to my-app                   │
├──────────────────────────────────────────────┤
│                                              │
│  I've analyzed your React application with   │
│  Express backend. What would you like to     │
│  work on?                                    │
│                                              │
│  Suggested features based on your codebase:  │
│                                              │
│  □ Add user authentication                   │
│  □ Implement API rate limiting               │
│  □ Add unit tests for API endpoints          │
│  □ Other (describe your feature)             │
│                                              │
└──────────────────────────────────────────────┘
```

> **Note:** User selects a suggested feature or describes a custom one.

### 3. Gather Requirements

Select an option or describe your feature. The AI guides you through requirements:

```
┌──────────────────────────────────────────────────────┐
│   Requirements Gathering Conversation                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  👤 User:                                            │
│     Add user authentication                          │
│                                                      │
│  🤖 Shep:                                            │
│     Great! Let's define the authentication           │
│     requirements. Which authentication method        │
│     would you like?                                  │
│                                                      │
│     □ Email/password                                 │
│     □ OAuth (Google, GitHub)                         │
│     □ Magic links                                    │
│     □ All of the above                               │
│                                                      │
│  👤 User:                                            │
│     OAuth (Google, GitHub)                           │
│                                                      │
│  🤖 Shep:                                            │
│     Got it. For OAuth, I'll need to know:            │
│     Should users be able to link multiple OAuth      │
│     providers?                                       │
│                                                      │
│     □ Yes, allow linking multiple accounts           │
│     □ No, one provider per user                      │
│                                                      │
│  ...continued...                                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

> **Note:** Conversational flow where Shep asks clarifying questions based on user selections.

### 4. Review the Plan

Once requirements are complete, Shep generates a plan:

```
┌───────────────────────────────────────────────────┐
│ Feature: User Authentication | Lifecycle: Plan    │
├───────────────────────────────────────────────────┤
│                                                   │
│ ┌─ TASKS (5) ─────────────────────────────────┐  │
│ │                                              │  │
│ │  □ Set up OAuth provider configuration       │  │
│ │  □ Create user model and migrations          │  │
│ │  □ Implement OAuth callback handlers         │  │
│ │  □ Add authentication middleware             │  │
│ │  □ Create login/logout UI components         │  │
│ │                                              │  │
│ └──────────────────────────────────────────────┘  │
│                                                   │
│ ┌─ DOCUMENTATION (3) ──────────────────────────┐  │
│ │                                              │  │
│ │  📄 Product Requirements Document            │  │
│ │  📄 Technical RFC                            │  │
│ │  📄 Implementation Tech Plan                 │  │
│ │                                              │  │
│ └──────────────────────────────────────────────┘  │
│                                                   │
│ ┌─ Actions ────────────────────────────────────┐  │
│ │  [Implement]    [Edit Plan]                  │  │
│ └──────────────────────────────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
```

> **Note:** User can click [Implement] to start autonomous code generation or [Edit Plan] to modify tasks.

### 5. Start Implementation

Click "Implement" to begin autonomous code generation:

```
Implementing: User Authentication | Progress: 2/5 tasks complete

✓ Set up OAuth provider configuration
✓ Create user model and migrations
● Implement OAuth callback handlers
  └─ Creating src/routes/auth.ts
○ Add authentication middleware
○ Create login/logout UI components
```

> **Note:** ✓ = completed tasks, ● = in progress (with current file being modified), ○ = pending tasks.

## Next Steps

- Learn about [configuration options](./configuration.md)
- Explore the [CLI commands](./cli-commands.md)
- Master the [web UI](./web-ui.md)

## Troubleshooting

### Analysis Takes Too Long

Large repositories may take longer. You can:

1. Add exclusions to `.shep/config.json`:

   ```json
   {
     "analysis": {
       "additionalExcludes": ["**/large-folder/**"]
     }
   }
   ```

2. Use shallow analysis:
   ```bash
   shep --init --shallow
   ```

### Authentication Failed

If authentication fails:

1. Check your API key is valid for your selected provider
2. Ensure you have access to your chosen agent provider
3. Try re-authenticating:
   ```bash
   shep --auth
   ```
4. To switch providers:
   ```bash
   shep --setup
   ```

### Port Already in Use

If port 4050 is busy:

```bash
shep ui --port 4051
```

---

## Maintaining This Document

**Update when:**

- Installation process changes
- Setup wizard flow changes
- New features affect getting started
- Troubleshooting items are discovered

**Related docs:**

- [configuration.md](./configuration.md) - Detailed config
- [cli-commands.md](./cli-commands.md) - CLI reference
