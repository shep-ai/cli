# Plan: agent-memory-layer

> Implementation plan for 011-agent-memory-layer

## Status

- **Phase:** Planning
- **Updated:** 2026-02-09

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Shep AI Memory Layer Architecture                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────── Application Layer ─────────────────────┐   │
│  │                                                                │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │          IMemoryService (Port Interface)                │ │   │
│  │  │  - store(episode)                                       │ │   │
│  │  │  - retrieve(query, scope)                               │ │   │
│  │  │  - pruneOldMemories(policy)                             │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  │                            ▲                                  │   │
│  └────────────────────────────┼───────────────────────────────────┘   │
│                                │                                        │
│  ┌────────────────── Infrastructure Layer ──────────────────────┐     │
│  │                            │                                  │     │
│  │  ┌─────────────────────────▼─────────────────────────────┐  │     │
│  │  │       MemoryService (Orchestrator)                    │  │     │
│  │  │  - Hybrid retrieval (semantic + graph)                │  │     │
│  │  │  - Multi-graph scoping (global + feature)             │  │     │
│  │  │  - Memory persistence & pruning                        │  │     │
│  │  └────────────────────┬───────────────────────────────────┘  │     │
│  │                       │                                       │     │
│  │       ┌───────────────┼───────────────┐                      │     │
│  │       │               │               │                      │     │
│  │  ┌────▼──────┐ ┌──────▼──────┐ ┌─────▼──────┐              │     │
│  │  │ Embedding │ │   Vector    │ │   Graph    │              │     │
│  │  │  Service  │ │    Store    │ │   Store    │              │     │
│  │  │           │ │   Service   │ │  Service   │              │     │
│  │  │- generate()│ │ - upsert() │ │- addTriple()│             │     │
│  │  │- batch()  │ │ - search() │ │ - query()  │              │     │
│  │  └────┬──────┘ └──────┬──────┘ └─────┬──────┘              │     │
│  │       │               │               │                      │     │
│  │  ┌────▼──────────┐ ┌──▼────────┐ ┌───▼────────┐            │     │
│  │  │Transformers.js│ │  LanceDB  │ │ Quadstore  │            │     │
│  │  │ (Embeddings)  │ │ (Vectors) │ │  (Graph)   │            │     │
│  │  └───────────────┘ └───────────┘ └────────────┘            │     │
│  │                                                              │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ┌───────────────────── Storage Layer ───────────────────────────┐   │
│  │                                                                │   │
│  │  ~/.shep/memory/                                              │   │
│  │  ├── vectors/                                                 │   │
│  │  │   ├── global/          # Global embeddings (LanceDB)      │   │
│  │  │   └── features/        # Per-feature embeddings           │   │
│  │  │       └── {featureId}/ # Feature-specific vectors         │   │
│  │  ├── graphs/                                                  │   │
│  │  │   ├── global/          # Global memory graph (Quadstore)  │   │
│  │  │   └── features/        # Per-feature graphs               │   │
│  │  │       └── {featureId}/ # Feature-specific graph data      │   │
│  │  └── models/                                                  │   │
│  │      └── embeddings/      # Cached ONNX models               │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘

Data Flow:
1. Agent interaction → Episode created
2. Episode → MemoryService.store()
3. MemoryService → EmbeddingService.generate() → Transformers.js
4. Embeddings → VectorStoreService.upsert() → LanceDB
5. Episode metadata → GraphStoreService.addTriple() → Quadstore
6. Agent query → MemoryService.retrieve(query, scope)
7. Query → EmbeddingService.generate() → Vector
8. Vector → VectorStoreService.search() → Top-K similar episodes
9. Episode IDs → GraphStoreService.query() → Related episodes via graph
10. Hybrid results → Ranked & returned to agent
```

## Implementation Strategy

### Phase 1: Foundation & TypeSpec Models (NO TESTS)

**Purpose:** Set up directory structure, TypeSpec domain models, and build pipeline.

**What we'll build:**

1. **Directory Structure:**

   - Create `~/.shep/memory/` with subdirectories (vectors, graphs, models)
   - Set proper permissions (0700 for privacy)

2. **TypeSpec Domain Models:**

   - `tsp/domain/entities/memory/episode.tsp` - Main memory unit
   - `tsp/domain/entities/memory/memory-node.tsp` - Graph node
   - `tsp/domain/entities/memory/memory-edge.tsp` - Graph relationship
   - `tsp/domain/entities/memory/memory-fragment.tsp` - Conversation snippet
   - `tsp/common/enums/memory-scope.tsp` - Global vs Feature-specific
   - `tsp/common/enums/memory-type.tsp` - Episode types (conversation, decision, pattern)

3. **Generate TypeScript types:**
   - Run `pnpm tsp:compile` to generate types in `src/domain/generated/output.ts`

**Why no tests:** Infrastructure setup and code generation don't need tests.

**Deliverable:** TypeSpec models compiled, directory structure created.

---

### Phase 2: Embedding Service (TDD CYCLE)

**Purpose:** Implement local embedding generation using Transformers.js with ONNX Runtime.

#### RED: Write Failing Tests First

**Unit Tests** (`tests/unit/infrastructure/services/memory/embedding.service.test.ts`):

- ✗ `generateEmbedding()` - Should generate 384-dim vector for text input
- ✗ `generateBatch()` - Should batch process multiple texts
- ✗ `initialize()` - Should load ONNX model on first call (lazy loading)
- ✗ Error handling - Should throw on invalid input (empty string, null)

**Test mocks:** Mock `@xenova/transformers` pipeline to avoid downloading models during tests.

#### GREEN: Minimal Implementation

**Create:**

- `src/infrastructure/services/memory/embedding.service.ts`:
  - `EmbeddingService` class implementing embedding generation
  - `initialize()` - Lazy load Transformers.js pipeline
  - `generateEmbedding(text: string): Promise<number[]>` - Single text embedding
  - `generateBatch(texts: string[]): Promise<number[][]>` - Batch embeddings
  - Use `@xenova/transformers` with `mixedbread-ai/mxbai-embed-xsmall-v1` model
  - Cache model in `~/.shep/memory/models/embeddings/`

**Install dependencies:**

```bash
pnpm add @xenova/transformers
```

#### REFACTOR: Improve Code Quality

- Extract model configuration to constants
- Add progress logging for batch operations
- Optimize batch size for performance
- Add JSDoc documentation

**Deliverable:** Embedding service with passing unit tests, local ONNX embeddings working.

---

### Phase 3: Vector Storage Service (TDD CYCLE)

**Purpose:** Implement vector storage and semantic search using LanceDB.

#### RED: Write Failing Tests First

**Integration Tests** (`tests/integration/infrastructure/services/memory/vector-store.service.test.ts`):

- ✗ `upsert()` - Should store episode with embedding
- ✗ `search()` - Should retrieve top-K similar episodes by vector
- ✗ `searchByScope()` - Should filter results by scope (global vs feature-specific)
- ✗ `delete()` - Should remove episode from vector store
- ✗ File persistence - Should persist data across service restarts

**Test setup:** Use temp directory for LanceDB during tests.

#### GREEN: Minimal Implementation

**Create:**

- `src/infrastructure/services/memory/vector-store.service.ts`:
  - `VectorStoreService` class for vector operations
  - `upsert(episode: Episode, embedding: number[]): Promise<void>` - Store/update
  - `search(query: number[], topK: number, scope?: MemoryScope): Promise<Episode[]>` - Search
  - `delete(episodeId: string): Promise<void>` - Remove
  - Use LanceDB with schema: `{id: string, episodeId: string, embedding: vector, scope: string, createdAt: timestamp}`
  - Store in `~/.shep/memory/vectors/{scope}/`

**Install dependencies:**

```bash
pnpm add vectordb  # LanceDB TypeScript client
```

#### REFACTOR: Improve Code Quality

- Add connection pooling for LanceDB
- Optimize index parameters for search speed
- Add metadata filtering support
- Extract table schema to constants

**Deliverable:** Vector store service with passing integration tests, semantic search working.

---

### Phase 4: Graph Storage Service (TDD CYCLE)

**Purpose:** Implement graph storage for memory relationships using Quadstore.

#### RED: Write Failing Tests First

**Integration Tests** (`tests/integration/infrastructure/services/memory/graph-store.service.test.ts`):

- ✗ `addTriple()` - Should store RDF triple (subject-predicate-object)
- ✗ `query()` - Should execute SPARQL query and return results
- ✗ `getRelatedEpisodes()` - Should traverse graph to find related episodes
- ✗ `removeEpisode()` - Should delete episode and all related triples
- ✗ Named graphs - Should isolate global vs feature-specific graphs
- ✗ File persistence - Should persist data across service restarts

**Test setup:** Use temp directory for Quadstore LevelDB during tests.

#### GREEN: Minimal Implementation

**Create:**

- `src/infrastructure/services/memory/graph-store.service.ts`:
  - `GraphStoreService` class for graph operations
  - `addTriple(subject, predicate, object, graph?): Promise<void>` - Add relationship
  - `query(sparql: string): Promise<any[]>` - Execute SPARQL
  - `getRelatedEpisodes(episodeId: string, scope?: MemoryScope): Promise<string[]>` - Traverse
  - `removeEpisode(episodeId: string): Promise<void>` - Delete
  - Use Quadstore with LevelDB backend
  - Named graphs: `shep:global` and `shep:feature:{id}`
  - Store in `~/.shep/memory/graphs/{scope}/`

**Install dependencies:**

```bash
pnpm add quadstore level  # Quadstore + LevelDB
```

#### REFACTOR: Improve Code Quality

- Create SPARQL query builder utility
- Add graph schema constants (predicates: `hasContext`, `followsFrom`, `relatesTo`)
- Extract graph URIs to constants
- Add bulk insert optimization

**Deliverable:** Graph store service with passing integration tests, relationship queries working.

---

### Phase 5: Memory Service Orchestration (TDD CYCLE)

**Purpose:** High-level memory service orchestrating embedding, vector, and graph storage.

#### RED: Write Failing Tests First

**Unit Tests** (`tests/unit/infrastructure/services/memory/memory.service.test.ts`):

- ✗ `store()` - Should orchestrate embedding generation + vector upsert + graph triple
- ✗ `retrieve()` - Should perform hybrid retrieval (semantic + graph)
- ✗ `retrieveByScope()` - Should respect global vs feature-specific scope
- ✗ `pruneOldMemories()` - Should delete memories older than retention policy
- ✗ Error handling - Should handle embedding/storage failures gracefully

**Mock dependencies:** Mock EmbeddingService, VectorStoreService, GraphStoreService.

**Integration Tests** (`tests/integration/infrastructure/services/memory/memory.service.integration.test.ts`):

- ✗ End-to-end store + retrieve flow
- ✗ Hybrid retrieval (semantic + graph) returns correct results
- ✗ Scoping works correctly (global vs feature isolation)

#### GREEN: Minimal Implementation

**Create:**

- `src/application/ports/output/memory-service.interface.ts`:

  - `IMemoryService` port interface
  - Methods: `store()`, `retrieve()`, `pruneOldMemories()`

- `src/infrastructure/services/memory/memory.service.ts`:
  - `MemoryService` class implementing `IMemoryService`
  - Constructor injects: EmbeddingService, VectorStoreService, GraphStoreService
  - `store(episode: Episode): Promise<void>` - Generate embedding → upsert vector → add graph triple
  - `retrieve(query: string, topK: number, scope?: MemoryScope): Promise<Episode[]>` - Hybrid retrieval
  - `pruneOldMemories(retentionDays: number): Promise<void>` - Delete old memories
  - Hybrid retrieval logic: (1) Semantic search via vectors, (2) Graph expansion via relationships, (3) Re-rank combined results

#### REFACTOR: Improve Code Quality

- Extract hybrid retrieval to separate method
- Add caching for recent queries
- Optimize graph traversal depth
- Add metrics/logging for retrieval performance

**Deliverable:** Memory service with passing tests, hybrid retrieval working.

---

### Phase 6: Agent Integration (TDD CYCLE)

**Purpose:** Integrate memory service into LangGraph agent execution loop.

#### RED: Write Failing Tests First

**Integration Tests** (`tests/integration/infrastructure/agents/memory-integration.test.ts`):

- ✗ Agent stores episode after completing task
- ✗ Agent retrieves relevant context before starting new task
- ✗ Memory scoping works (feature-specific context not leaked to global)

**E2E Tests** (`tests/e2e/cli/agent-memory.test.ts`):

- ✗ CLI agent run stores conversation in memory
- ✗ Subsequent agent run retrieves previous context
- ✗ Feature-specific memory isolated from global

#### GREEN: Minimal Implementation

**Modify:**

- `src/infrastructure/services/agents/langgraph/analyze-repository-graph.ts`:

  - Add memory node: `addNode('retrieveMemory', retrieveMemoryNode)`
  - Add memory node: `addNode('storeMemory', storeMemoryNode)`
  - Update edges: `START → retrieveMemory → analyze → storeMemory → END`
  - `retrieveMemoryNode`: Query memory service for relevant context, inject into prompt
  - `storeMemoryNode`: Create episode from state, call memory service to store

- `src/infrastructure/di/container.ts`:
  - Register EmbeddingService, VectorStoreService, GraphStoreService, MemoryService
  - Wire dependencies via constructor injection

**Create:**

- `src/infrastructure/services/agents/langgraph/nodes/retrieve-memory.node.ts`
- `src/infrastructure/services/agents/langgraph/nodes/store-memory.node.ts`

#### REFACTOR: Improve Code Quality

- Extract memory context formatting to utility
- Add configurable context window size
- Optimize memory retrieval latency
- Add telemetry for memory operations

**Deliverable:** Agent integration with passing tests, memory working in agent execution.

---

### Phase 7: Configuration & Settings (TDD CYCLE)

**Purpose:** Expose memory configuration via settings.

#### RED: Write Failing Tests First

**Unit Tests** (`tests/unit/infrastructure/services/memory/memory-config.test.ts`):

- ✗ Default configuration should use Transformers.js
- ✗ Optional Ollama configuration should override embedding service
- ✗ Retention policy should apply correctly
- ✗ Storage paths should be configurable

#### GREEN: Minimal Implementation

**Modify:**

- `tsp/domain/entities/settings.tsp`:

  - Add `memory: MemoryConfig` field
  - Define `MemoryConfig` model: embeddingProvider (Transformers | Ollama), retentionDays, storagePath, enableMemory

- `src/infrastructure/services/settings.service.ts`:
  - Read memory config from settings
  - Pass to MemoryService constructor

**Create:**

- `src/infrastructure/services/memory/config/memory-config.validator.ts` - Validate settings

#### REFACTOR: Improve Code Quality

- Add validation for storage paths
- Document memory configuration in README
- Add CLI command for memory stats (`shep memory stats`)

**Deliverable:** Memory configuration via settings with passing tests.

---

### Phase 8: Documentation & Examples

**Purpose:** Document memory system for users and developers.

**Create:**

- `docs/memory/architecture.md` - System architecture overview
- `docs/memory/configuration.md` - Configuration guide (Transformers.js vs Ollama)
- `docs/memory/api-reference.md` - IMemoryService interface documentation
- `README.md` - Update with memory section

**Update:**

- `CLAUDE.md` - Add memory layer architecture section

**Deliverable:** Complete documentation for memory layer.

---

## Files to Create/Modify

### New Files

| File                                                                                  | Purpose                           |
| ------------------------------------------------------------------------------------- | --------------------------------- |
| `tsp/domain/entities/memory/episode.tsp`                                              | Episode entity (main memory unit) |
| `tsp/domain/entities/memory/memory-node.tsp`                                          | Graph node entity                 |
| `tsp/domain/entities/memory/memory-edge.tsp`                                          | Graph relationship entity         |
| `tsp/domain/entities/memory/memory-fragment.tsp`                                      | Conversation snippet entity       |
| `tsp/common/enums/memory-scope.tsp`                                                   | Global vs Feature-specific enum   |
| `tsp/common/enums/memory-type.tsp`                                                    | Episode type enum                 |
| `src/application/ports/output/memory-service.interface.ts`                            | Memory service port interface     |
| `src/infrastructure/services/memory/embedding.service.ts`                             | Transformers.js embedding service |
| `src/infrastructure/services/memory/vector-store.service.ts`                          | LanceDB vector storage            |
| `src/infrastructure/services/memory/graph-store.service.ts`                           | Quadstore graph storage           |
| `src/infrastructure/services/memory/memory.service.ts`                                | High-level memory orchestration   |
| `src/infrastructure/services/memory/config/memory-config.validator.ts`                | Config validation                 |
| `src/infrastructure/services/agents/langgraph/nodes/retrieve-memory.node.ts`          | Memory retrieval LangGraph node   |
| `src/infrastructure/services/agents/langgraph/nodes/store-memory.node.ts`             | Memory storage LangGraph node     |
| `tests/unit/infrastructure/services/memory/embedding.service.test.ts`                 | Embedding service unit tests      |
| `tests/integration/infrastructure/services/memory/vector-store.service.test.ts`       | Vector store integration tests    |
| `tests/integration/infrastructure/services/memory/graph-store.service.test.ts`        | Graph store integration tests     |
| `tests/unit/infrastructure/services/memory/memory.service.test.ts`                    | Memory service unit tests         |
| `tests/integration/infrastructure/services/memory/memory.service.integration.test.ts` | Memory service integration tests  |
| `tests/integration/infrastructure/agents/memory-integration.test.ts`                  | Agent memory integration tests    |
| `tests/e2e/cli/agent-memory.test.ts`                                                  | CLI agent memory E2E tests        |
| `docs/memory/architecture.md`                                                         | Memory architecture documentation |
| `docs/memory/configuration.md`                                                        | Memory configuration guide        |
| `docs/memory/api-reference.md`                                                        | API reference documentation       |

### Modified Files

| File                                                                       | Changes                                                                    |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `tsp/domain/entities/settings.tsp`                                         | Add `memory: MemoryConfig` field                                           |
| `src/infrastructure/di/container.ts`                                       | Register memory services in DI container                                   |
| `src/infrastructure/services/agents/langgraph/analyze-repository-graph.ts` | Add memory nodes to graph (retrieve + store)                               |
| `src/infrastructure/services/settings.service.ts`                          | Load memory configuration from settings                                    |
| `package.json`                                                             | Add dependencies: `@xenova/transformers`, `vectordb`, `quadstore`, `level` |
| `CLAUDE.md`                                                                | Document memory layer architecture                                         |
| `README.md`                                                                | Add memory system overview                                                 |

---

## Testing Strategy

### Unit Tests

**Embedding Service:**

- Embedding generation (mock Transformers.js pipeline)
- Batch processing with mocked models
- Error handling (invalid input, model loading failures)
- Lazy initialization

**Memory Service:**

- Store orchestration (mock all dependencies)
- Retrieve hybrid logic (mock vector + graph results)
- Pruning logic (mock deletions)
- Scoping logic (global vs feature)

**Memory Configuration:**

- Default configuration validation
- Ollama override configuration
- Retention policy application

### Integration Tests

**Vector Store Service:**

- Upsert and retrieve from real LanceDB (temp directory)
- Search with scoping filters
- Persistence across restarts
- Delete operations

**Graph Store Service:**

- Triple storage in real Quadstore (temp directory)
- SPARQL query execution
- Graph traversal for related episodes
- Named graph isolation (global vs feature)
- Persistence across restarts

**Memory Service Integration:**

- End-to-end store + retrieve flow with real dependencies
- Hybrid retrieval accuracy (semantic + graph)
- Scoping isolation

**Agent Memory Integration:**

- Agent stores episode after task completion
- Agent retrieves context before new task
- Feature-specific memory isolation

### E2E Tests

**CLI Agent Memory:**

- Run agent via CLI, verify memory stored
- Run agent again, verify context retrieved
- Verify feature-specific memory isolated from global

---

## Risk Mitigation

| Risk                                    | Mitigation                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Transformers.js model download slow** | Cache models in `~/.shep/memory/models/`, lazy load on first use, add progress logging                     |
| **LanceDB file corruption**             | Implement backup strategy, add file validation on startup, use atomic writes                               |
| **Quadstore LevelDB lock issues**       | Ensure proper cleanup on process exit, add lock timeout, handle concurrent access                          |
| **Memory retrieval latency > 300ms**    | Optimize batch embeddings, tune vector index parameters, cache recent queries, limit graph traversal depth |
| **Memory growth unbounded**             | Implement pruning policy (default 90 days), add memory stats CLI command, monitor storage size             |
| **Breaking changes in dependencies**    | Pin versions in package.json, add dependency update tests, document version constraints                    |
| **Multi-process access conflicts**      | Use file locking for LanceDB/Quadstore, implement retry logic, document single-process limitation          |

---

## Rollback Plan

If memory layer causes issues:

1. **Disable memory via settings:**

   - Add `memory.enableMemory = false` flag in settings
   - Agent falls back to stateless mode

2. **Remove memory nodes from graph:**

   - Comment out `retrieveMemory` and `storeMemory` nodes
   - Graph functions without memory

3. **Clean storage:**

   ```bash
   rm -rf ~/.shep/memory/
   ```

4. **Revert dependencies:**

   ```bash
   pnpm remove @xenova/transformers vectordb quadstore level
   ```

5. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   ```

**Data loss risk:** Memory data will be lost if storage is cleaned. Backup `~/.shep/memory/` before rollback if data recovery is needed.

---

_Updated by `/shep-kit:plan` — see tasks.md for detailed breakdown_
