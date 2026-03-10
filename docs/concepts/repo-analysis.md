# Repository Analysis

Repository analysis is the foundational process that examines a codebase from multiple perspectives, providing context for AI-driven feature development.

## Overview

When a user runs `shep` in a repository, the system can perform analysis before feature work begins. This analysis:

1. Provides context for requirement gathering
2. Informs planning decisions
3. Guides implementation approaches
4. Ensures AI suggestions align with existing patterns

## Implementation

The analysis is implemented as a LangGraph graph in `packages/core/src/infrastructure/services/agents/analyze-repo/`. It uses the `AnalyzeRepositoryState` annotation with a single `analyze` node that delegates to an `IAgentExecutor`.

```typescript
// packages/core/src/infrastructure/services/agents/analyze-repo/analyze-repository-graph.ts
export const AnalyzeRepositoryState = Annotation.Root({
  repositoryPath: Annotation<string>,
  analysisMarkdown: Annotation<string>,
  error: Annotation<string | undefined>,
});
```

The analysis node builds a prompt from the repository path and delegates execution to the injected `IAgentExecutor` (Claude Code, Gemini CLI, etc.).

## Analysis Perspectives

The AI agent examines the repository across multiple dimensions:

### Architecture Analysis

- Directory organization
- Module boundaries
- Layer separation (if any)
- Entry points
- Configuration patterns

### Dependency Analysis

- Direct dependencies
- Dev dependencies
- Peer dependencies
- Version constraints

### Pattern Detection

- Design patterns in use
- State management approach
- Error handling patterns
- Testing patterns
- API patterns

### Convention Extraction

- Naming conventions (files, variables, functions)
- Code style
- Import organization
- Documentation patterns

### Technology Stack

- Language(s) and version(s)
- Framework(s)
- Build tools
- Test frameworks
- CI/CD configuration

## Storage Structure

Analysis output is persisted for instant access:

```
~/.shep/repos/<base64-encoded-repo-path>/
+-- data                    # SQLite database
+-- docs/                   # Analysis documents
    +-- architecture.md
    +-- dependencies.md
    +-- patterns.md
    +-- conventions.md
    +-- tech-stack.md
    +-- documentation.md
    +-- summary.json        # Quick-access summary
```

### Path Encoding

Repository paths are base64-encoded for directory safety:

```typescript
function encodeRepoPath(repoPath: string): string {
  return Buffer.from(repoPath).toString('base64url');
}
```

## Analysis Flow

```
1. User runs: shep (or analysis is triggered for a feature)
         |
         v
2. AnalyzeRepository LangGraph invoked
         |
         v
3. IAgentExecutor generates analysis document
         |
         v
4. Analysis markdown persisted to docs/
         |
         v
5. Analysis available for subsequent agent workflows
```

## Consuming Analysis

Analysis context is available to the FeatureAgent LangGraph during:

- **Requirements gathering** -- Understanding existing patterns and capabilities
- **Planning** -- Respecting architecture boundaries and conventions
- **Implementation** -- Following established code patterns

---

## Maintaining This Document

**Update when:**

- Analysis perspectives change
- Storage structure changes
- LangGraph implementation evolves

**Related docs:**

- [../architecture/agent-system.md](../architecture/agent-system.md) - Agent system architecture
- [AGENTS.md](../../AGENTS.md) - Agent overview
