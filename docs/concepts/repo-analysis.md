# Repository Analysis

Repository analysis is the foundational process that examines a codebase from multiple perspectives, providing context for AI-driven feature development.

## Overview

When a user runs `shep` in a repository, the system performs comprehensive analysis before any feature work begins. This analysis:

1. Provides context for requirement gathering
2. Informs planning decisions
3. Guides implementation approaches
4. Ensures AI suggestions align with existing patterns

## Analysis Perspectives

### Architecture Analysis

Examines high-level structure:

- Directory organization
- Module boundaries
- Layer separation (if any)
- Entry points
- Configuration patterns

**Output:** `architecture.md`

### Dependency Analysis

Maps project dependencies:

- Direct dependencies
- Dev dependencies
- Peer dependencies
- Dependency graph
- Version constraints
- Known vulnerabilities (optional)

**Output:** `dependencies.md`

### Pattern Detection

Identifies coding patterns:

- Design patterns in use
- State management approach
- Error handling patterns
- Logging patterns
- Testing patterns
- API patterns

**Output:** `patterns.md`

### Convention Extraction

Learns project conventions:

- Naming conventions (files, variables, functions)
- Code style (indentation, quotes, etc.)
- Import organization
- Comment style
- Documentation patterns

**Output:** `conventions.md`

### Technology Stack

Identifies technologies:

- Language(s) and version(s)
- Framework(s)
- Build tools
- Test frameworks
- CI/CD configuration
- Deployment targets

**Output:** `tech-stack.md`

### Documentation Inventory

Catalogs existing docs:

- README files
- API documentation
- Code comments
- Architecture docs
- Contributing guides

**Output:** `documentation.md`

## Storage Structure

Analysis is persisted for instant access:

```
~/.shep/repos/<base64-encoded-repo-path>/
├── data                    # SQLite database
└── docs/                   # Analysis documents
    ├── architecture.md
    ├── dependencies.md
    ├── patterns.md
    ├── conventions.md
    ├── tech-stack.md
    ├── documentation.md
    └── summary.json        # Quick-access summary
```

### Path Encoding

Repository paths are base64-encoded for directory safety:

```typescript
function encodeRepoPath(repoPath: string): string {
  return Buffer.from(repoPath).toString('base64url');
}

// /home/user/projects/myapp → aG9tZS91c2VyL3Byb2plY3RzL215YXBw
```

## Analysis Process

### Trigger Conditions

Analysis runs when:

1. First `shep` execution in a repository
2. User explicitly requests re-analysis
3. Significant time has passed since last analysis
4. Major file changes detected (optional)

### Analysis Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Repository Analysis                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              File Discovery                           │   │
│  │  - Respect .gitignore                                 │   │
│  │  - Skip binary files                                  │   │
│  │  - Limit large files                                  │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Parallel Perspective Analysis               │   │
│  │                                                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │  │  Arch   │ │  Deps   │ │Patterns │ │ Convs   │    │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘    │   │
│  │       │           │           │           │          │   │
│  └───────┴───────────┴───────────┴───────────┴──────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Summary Generation                       │   │
│  │  - Aggregate findings                                 │   │
│  │  - Create quick-access JSON                           │   │
│  │  - Identify key insights                              │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Persistence                              │   │
│  │  - Write markdown files                               │   │
│  │  - Update summary.json                                │   │
│  │  - Record analysis timestamp                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Progress Tracking

Web UI displays analysis progress:

```
┌─────────────────────────────────────────────────────────────┐
│              Analyzing Repository...                         │
│                                                              │
│  [████████████████░░░░░░░░░░░░░░] 55%                       │
│                                                              │
│  ✓ File discovery complete                                  │
│  ✓ Architecture analysis complete                           │
│  ● Dependency analysis in progress...                       │
│  ○ Pattern detection pending                                │
│  ○ Convention extraction pending                            │
│  ○ Summary generation pending                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Global Configuration

In `~/.shep/config.json`:

```json
{
  "analysis": {
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/.git/**"
    ],
    "maxFileSize": 1048576,
    "maxFiles": 10000,
    "perspectives": [
      "architecture",
      "dependencies",
      "patterns",
      "conventions",
      "tech-stack",
      "documentation"
    ]
  }
}
```

### Per-Repository Configuration

In `.shep/config.json` within the repository:

```json
{
  "analysis": {
    "additionalExcludes": ["**/generated/**"],
    "customPerspectives": ["security"],
    "reanalyzeOnChange": true
  }
}
```

## Agent Implementation

```typescript
// src/infrastructure/agents/repository-analysis.agent.ts
export class RepositoryAnalysisAgent extends BaseAgent {
  async execute(task: AgentTask): Promise<AnalysisResult> {
    const { repoPath, config } = task.payload;

    // Discover files
    const files = await this.discoverFiles(repoPath, config);

    // Run analyses in parallel
    const results = await Promise.all([
      this.analyzeArchitecture(files),
      this.analyzeDependencies(repoPath),
      this.detectPatterns(files),
      this.extractConventions(files),
      this.identifyTechStack(repoPath, files),
      this.inventoryDocumentation(files)
    ]);

    // Generate summary
    const summary = this.generateSummary(results);

    // Persist
    await this.persistAnalysis(repoPath, results, summary);

    return { summary, analysisPath: this.getAnalysisPath(repoPath) };
  }
}
```

## Consuming Analysis

### In Requirements Gathering

```typescript
class RequirementsAgent {
  async generateOptions(analysisContext: AnalysisSummary): Promise<Option[]> {
    // Use tech stack to suggest relevant features
    const techOptions = this.suggestFromTechStack(analysisContext.techStack);

    // Use patterns to suggest improvements
    const patternOptions = this.suggestFromPatterns(analysisContext.patterns);

    return [...techOptions, ...patternOptions];
  }
}
```

### In Planning

```typescript
class PlanningAgent {
  async createTasks(feature: Feature, analysis: AnalysisSummary): Promise<Task[]> {
    // Follow existing conventions
    const conventions = analysis.conventions;

    // Respect architecture boundaries
    const architecture = analysis.architecture;

    // Use existing patterns
    const patterns = analysis.patterns;

    return this.generateTasks(feature, { conventions, architecture, patterns });
  }
}
```

---

## Maintaining This Document

**Update when:**
- New analysis perspectives are added
- Storage structure changes
- Configuration options change
- Analysis process evolves

**Related docs:**
- [../architecture/agent-system.md](../architecture/agent-system.md) - RepositoryAnalysisAgent
- [../guides/configuration.md](../guides/configuration.md) - Config options
- [AGENTS.md](../../AGENTS.md) - Agent overview
