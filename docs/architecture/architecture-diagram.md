# Architecture Diagram

Comprehensive architecture diagram for the Shep AI CLI platform.

## System Architecture

```mermaid
flowchart TB
    subgraph Presentation["Presentation Layer"]
        direction LR
        CLI["CLI<br/><i>Commander</i>"]
        TUI["TUI<br/><i>@inquirer/prompts</i>"]
        WebUI["Web UI<br/><i>Next.js + shadcn/ui</i>"]
    end

    subgraph Application["Application Layer"]
        direction LR
        UC["Use Cases"]
        IP["Input Ports"]
        OP["Output Ports"]
    end

    subgraph Domain["Domain Layer"]
        direction LR
        Entities["Entities<br/><i>Feature, Task,<br/>ActionItem, Artifact,<br/>Requirement</i>"]
        VO["Value Objects<br/><i>SdlcLifecycle,<br/>TaskStatus,<br/>ArtifactType</i>"]
        DS["Domain Services<br/><i>Dependency Validator,<br/>Lifecycle Rules</i>"]
    end

    subgraph Infrastructure["Infrastructure Layer"]
        direction LR
        Repos["Repositories<br/><i>SQLite impls</i>"]
        Agents["Agent System<br/><i>LangGraph +<br/>FeatureAgent</i>"]
        Services["Services<br/><i>FileSystem,<br/>Claude API</i>"]
    end

    subgraph External["External Systems"]
        direction LR
        DB[("SQLite<br/>~/.shep/data")]
        FS[("File System<br/>~/.shep/repos/")]
        AI[("Claude API")]
    end

    %% Dependency flow
    Presentation --> Application
    Application --> Domain
    Infrastructure -.->|implements| Application

    %% Infrastructure to external
    Repos --> DB
    Services --> FS
    Agents --> AI

    %% Styling
    style Presentation fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style Application fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style Domain fill:#d1fae5,stroke:#10b981,color:#064e3b
    style Infrastructure fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    style External fill:#f1f5f9,stroke:#64748b,color:#374151

    style CLI fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style TUI fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style WebUI fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style UC fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style IP fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style OP fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style Entities fill:#d1fae5,stroke:#10b981,color:#064e3b
    style VO fill:#d1fae5,stroke:#10b981,color:#064e3b
    style DS fill:#d1fae5,stroke:#10b981,color:#064e3b
    style Repos fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    style Agents fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    style Services fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    style DB fill:#f1f5f9,stroke:#64748b,color:#374151
    style FS fill:#f1f5f9,stroke:#64748b,color:#374151
    style AI fill:#f1f5f9,stroke:#64748b,color:#374151
```

## Dependency Rule

```
Presentation --> Application --> Domain <-- Infrastructure
```

- **Domain** depends on nothing (pure business logic)
- **Application** depends only on Domain (use cases, ports)
- **Infrastructure** implements Application interfaces (repositories, agents, services)
- **Presentation** depends on Application (calls use cases)

## Feature Lifecycle Flow

```mermaid
flowchart LR
    R["Requirements"] --> P["Plan"] --> I["Implementation"] --> T["Test"] --> D["Deploy"] --> M["Maintenance"]

    style R fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style P fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style I fill:#d1fae5,stroke:#10b981,color:#064e3b
    style T fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    style D fill:#f1f5f9,stroke:#64748b,color:#374151
    style M fill:#f1f5f9,stroke:#64748b,color:#374151
```

## Agent Workflow (LangGraph)

```mermaid
flowchart TD
    Start([Start]) --> Analyze["Analyze Repository"]
    Analyze --> Gather["Gather Requirements"]
    Gather --> Clear{Requirements clear?}
    Clear -->|No| Gather
    Clear -->|Yes| Plan["Create Plan"]
    Plan --> Implement["Execute Implementation"]
    Implement --> End([End])

    style Start fill:#f1f5f9,stroke:#64748b,color:#374151
    style Analyze fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style Gather fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style Clear fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style Plan fill:#d1fae5,stroke:#10b981,color:#064e3b
    style Implement fill:#ede9fe,stroke:#8b5cf6,color:#4c1d95
    style End fill:#f1f5f9,stroke:#64748b,color:#374151
```

## Web UI Component Tiers

```mermaid
flowchart TB
    T0["Tier 0: ui/<br/><i>shadcn/ui primitives</i>"]
    T1["Tier 1: common/<br/><i>Cross-feature composed</i>"]
    T2["Tier 2: layouts/<br/><i>Page shells, wrappers</i>"]
    T3["Tier 3: features/<br/><i>Domain-specific UI</i>"]

    T3 --> T2 --> T1 --> T0

    style T0 fill:#f1f5f9,stroke:#64748b,color:#374151
    style T1 fill:#dbeafe,stroke:#3b82f6,color:#1e3a5f
    style T2 fill:#fef3c7,stroke:#f59e0b,color:#78350f
    style T3 fill:#d1fae5,stroke:#10b981,color:#064e3b
```

## Technology Stack

| Concern | Choice | Layer |
|---------|--------|-------|
| Language | TypeScript | All |
| Package Manager | pnpm | Build |
| CLI Framework | Commander | Presentation |
| TUI Framework | @inquirer/prompts | Presentation |
| Web Framework | Next.js 16+ | Presentation |
| UI Components | shadcn/ui + Radix | Presentation |
| Design System | Storybook | Presentation |
| Domain Models | TypeSpec | Domain |
| Agent Orchestration | LangGraph | Infrastructure |
| Database | SQLite | Infrastructure |
| Build | tsc + tsc-alias | Build |
| Unit Testing | Vitest | All |
| E2E Testing | Playwright | Presentation |
| Methodology | TDD (Red-Green-Refactor) | All |

## Data Storage

```
~/.shep/
├── data                           # Global SQLite database
└── repos/
    └── <base64-encoded-repo-path>/
        ├── data                   # Per-repo SQLite database
        ├── docs/                  # Repository analysis docs
        └── artifacts/             # Generated feature artifacts
            └── <feature-id>/
                ├── prd.md
                ├── rfc.md
                └── ...
```
