# Plan: agent-memory-layer

> Implementation plan for 011-agent-memory-layer

## Status

- **Phase:** Complete
- **Updated:** 2026-02-10

## Architecture Overview

**Clean Architecture with Port-Based Design:** All services accessed through port interfaces in the application layer, with concrete implementations in the infrastructure layer.

```
┌──────────────────────────────────────────────────────────────────────┐
│              Shep AI Memory Layer - Clean Architecture               │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────── Application Layer ─────────────────────┐   │
│  │                    (Port Interfaces Only)                     │   │
│  │                                                                │   │
│  │  ┌──────────────────────────────────────────────────────┐    │   │
│  │  │           IMemoryService (Orchestration)             │    │   │
│  │  │  - store(episode)                                    │    │   │
│  │  │  - retrieve(query, scope)                            │    │   │
│  │  │  - pruneOldMemories(policy)                          │    │   │
│  │  └──────────────────────────────────────────────────────┘    │   │
│  │            ▲ depends on (interface injection)                 │   │
│  │            │                                                   │   │
│  │  ┌─────────┴──────────┬─────────────┬──────────────┐        │   │
│  │  │                    │             │              │        │   │
│  │  │ IEmbeddingService  │ IVectorStore│ IGraphStore  │        │   │
│  │  │                    │   Service   │   Service    │        │   │
│  │  │ - generate()       │ - upsert()  │ - addTriple()│        │   │
│  │  │ - batch()          │ - search()  │ - query()    │        │   │
│  │  └────────────────────┴─────────────┴──────────────┘        │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                            ▲ implements                                │
│                            │ (Dependency Inversion)                    │
│  ┌────────────────── Infrastructure Layer ──────────────────────┐     │
│  │                    (Concrete Implementations)                 │     │
│  │                                                                │     │
│  │  ┌──────────────────────────────────────────────────────┐    │     │
│  │  │       MemoryService implements IMemoryService        │    │     │
│  │  │  - Hybrid retrieval (semantic + graph)               │    │     │
│  │  │  - Multi-graph scoping (global + feature)            │    │     │
│  │  │  - Memory persistence & pruning                       │    │     │
│  │  │  - Depends on: IEmbeddingService, IVectorStoreService│    │     │
│  │  │                IGraphStoreService (via DI)           │    │     │
│  │  └──────────────────────────────────────────────────────┘    │     │
│  │                                                                │     │
│  │  ┌──────────────┐  ┌────────────────┐  ┌───────────────┐    │     │
│  │  │  Embedding   │  │  VectorStore   │  │  GraphStore   │    │     │
│  │  │   Service    │  │    Service     │  │   Service     │    │     │
│  │  │              │  │                │  │               │    │     │
│  │  │ implements   │  │  implements    │  │  implements   │    │     │
│  │  │ IEmbedding   │  │  IVectorStore  │  │  IGraphStore  │    │     │
│  │  │   Service    │  │    Service     │  │    Service    │    │     │
│  │  └──────┬───────┘  └───────┬────────┘  └───────┬───────┘    │     │
│  │         │                  │                    │             │     │
│  │  ┌──────▼─────────┐ ┌──────▼─────────┐ ┌───────▼────────┐   │     │
│  │  │ Transformers.js│ │    LanceDB     │ │   Quadstore    │   │     │
│  │  │  (ONNX/Local) │ │ (File-based)   │ │  (LevelDB)     │   │     │
│  │  └────────────────┘ └────────────────┘ └────────────────┘   │     │
│  │                                                                │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                        │
│  ┌───────────────────── Storage Layer ───────────────────────────┐   │
│  │  ~/.shep/memory/                                              │   │
│  │  ├── vectors/       # LanceDB vector data (global + features) │   │
│  │  ├── graphs/        # Quadstore graph data (global + features)│   │
│  │  └── models/        # Cached ONNX models (Transformers.js)    │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘

Data Flow (with Dependency Injection):
1. Agent interaction → Episode created
2. Episode → IMemoryService.store() [DI: MemoryService]
3. MemoryService → IEmbeddingService.generate() [DI: EmbeddingService]
4. Embeddings → IVectorStoreService.upsert() [DI: VectorStoreService]
5. Episode → IGraphStoreService.addTriple() [DI: GraphStoreService]
6. Agent query → IMemoryService.retrieve(query, scope)
7. Hybrid: IVectorStoreService.search() + IGraphStoreService.query()
8. Results → Ranked & returned to agent
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

### Phase 2: Port Interfaces (Application Layer)

**Purpose:** Define port interfaces following Clean Architecture's Dependency Inversion Principle.

**What we'll build:**

1. **IEmbeddingService Interface** (`application/ports/output/embedding-service.interface.ts`):

   ```typescript
   export interface IEmbeddingService {
     generateEmbedding(text: string): Promise<number[]>;
     generateBatch(texts: string[]): Promise<number[][]>;
   }
   ```

2. **IVectorStoreService Interface** (`application/ports/output/vector-store-service.interface.ts`):

   ```typescript
   export interface IVectorStoreService {
     upsert(episode: Episode, embedding: number[]): Promise<void>;
     search(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]>;
     searchByScope(
       queryEmbedding: number[],
       scope: MemoryScope,
       limit: number
     ): Promise<VectorSearchResult[]>;
     delete(episodeId: string): Promise<void>;
   }
   ```

3. **IGraphStoreService Interface** (`application/ports/output/graph-store-service.interface.ts`):

   ```typescript
   export interface IGraphStoreService {
     addTriple(
       subject: string,
       predicate: string,
       object: string,
       scope: MemoryScope
     ): Promise<void>;
     query(sparql: string, scope?: MemoryScope): Promise<SparqlResult[]>;
     getRelatedEpisodes(episodeId: string, scope?: MemoryScope, depth?: number): Promise<string[]>;
     removeEpisode(episodeId: string): Promise<void>;
   }
   ```

4. **IMemoryService Interface** (`application/ports/output/memory-service.interface.ts`):
   ```typescript
   export interface IMemoryService {
     store(episode: Episode): Promise<void>;
     retrieve(query: string, topK: number, scope?: MemoryScope): Promise<Episode[]>;
     pruneOldMemories(retentionDays: number): Promise<void>;
   }
   ```

**Why interfaces first:** Establishes contracts before implementation, enables TDD with mocks.

**Deliverable:** All port interfaces defined with clear contracts and JSDoc.

---

### Phase 3: Embedding Service (TDD CYCLE)

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
  - `EmbeddingService implements IEmbeddingService`
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

**Deliverable:** Embedding service implementing IEmbeddingService with passing unit tests.

---

### Phase 4: Vector Storage Service (TDD CYCLE)

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
  - `VectorStoreService implements IVectorStoreService`
  - `upsert(episode: Episode, embedding: number[]): Promise<void>` - Store/update
  - `search(query: number[], topK: number, scope?: MemoryScope): Promise<Episode[]>` - Search
  - `delete(episodeId: string): Promise<void>` - Remove
  - Use LanceDB with schema: `{id: string, episodeId: string, embedding: vector, scope: string, createdAt: timestamp}`
  - Store in `~/.shep/memory/vectors/{scope}/`

**Install dependencies:**

```bash
pnpm add @lancedb/lancedb apache-arrow
```

#### REFACTOR: Improve Code Quality

- Add connection pooling for LanceDB
- Optimize index parameters for search speed
- Add metadata filtering support
- Extract table schema to constants

**Deliverable:** Vector store service implementing IVectorStoreService with passing integration tests.

---

### Phase 5: Graph Storage Service (TDD CYCLE)

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
  - `GraphStoreService implements IGraphStoreService`
  - `addTriple(subject, predicate, object, graph?): Promise<void>` - Add relationship
  - `query(sparql: string): Promise<any[]>` - Execute SPARQL
  - `getRelatedEpisodes(episodeId: string, scope?: MemoryScope): Promise<string[]>` - Traverse
  - `removeEpisode(episodeId: string): Promise<void>` - Delete
  - Use Quadstore with LevelDB backend
  - Named graphs: `shep:global` and `shep:feature:{id}`
  - Store in `~/.shep/memory/graphs/{scope}/`

**Install dependencies:**

```bash
pnpm add quadstore level
```

#### REFACTOR: Improve Code Quality

- Create SPARQL query builder utility
- Add graph schema constants (predicates: `hasContext`, `followsFrom`, `relatesTo`)
- Extract graph URIs to constants
- Add bulk insert optimization

**Deliverable:** Graph store service implementing IGraphStoreService with passing integration tests.

---

### Phase 6: Memory Service Orchestration (TDD CYCLE)

**Purpose:** High-level memory service orchestrating embedding, vector, and graph storage.

#### RED: Write Failing Tests First

**Unit Tests** (`tests/unit/infrastructure/services/memory/memory.service.test.ts`):

- ✗ `store()` - Should orchestrate embedding generation + vector upsert + graph triple
- ✗ `retrieve()` - Should perform hybrid retrieval (semantic + graph)
- ✗ `retrieveByScope()` - Should respect global vs feature-specific scope
- ✗ `pruneOldMemories()` - Should delete memories older than retention policy
- ✗ Error handling - Should handle embedding/storage failures gracefully

**Mock dependencies:** Mock IEmbeddingService, IVectorStoreService, IGraphStoreService.

**Integration Tests** (`tests/integration/infrastructure/services/memory/memory.service.integration.test.ts`):

- ✗ End-to-end store + retrieve flow
- ✗ Hybrid retrieval (semantic + graph) returns correct results
- ✗ Scoping works correctly (global vs feature isolation)

#### GREEN: Minimal Implementation

**Create:**

- `src/infrastructure/services/memory/memory.service.ts`:
  - `MemoryService implements IMemoryService`
  - Constructor injects: `IEmbeddingService`, `IVectorStoreService`, `IGraphStoreService`
  - `store(episode: Episode): Promise<void>` - Generate embedding → upsert vector → add graph triple
  - `retrieve(query: string, topK: number, scope?: MemoryScope): Promise<Episode[]>` - Hybrid retrieval
  - `pruneOldMemories(retentionDays: number): Promise<void>` - Delete old memories
  - Hybrid retrieval logic: (1) Semantic search via vectors, (2) Graph expansion via relationships, (3) Re-rank combined results

#### REFACTOR: Improve Code Quality

- Extract hybrid retrieval to separate method
- Add caching for recent queries
- Optimize graph traversal depth
- Add metrics/logging for retrieval performance

**Deliverable:** Memory service implementing IMemoryService with passing tests, hybrid retrieval working.

---

### Phase 7: Dependency Injection Registration

**Purpose:** Wire up all memory services in the DI container with interface-based injection.

**What we'll build:**

**Modify `src/infrastructure/di/container.ts`:**

```typescript
// Register embedding service
container.registerSingleton<IEmbeddingService>('IEmbeddingService', { useClass: EmbeddingService });

// Register vector store service
container.register<IVectorStoreService>('IVectorStoreService', {
  useFactory: (c) => {
    const storagePath = join(homedir(), '.shep', 'memory', 'vectors');
    return new VectorStoreService(storagePath);
  },
});

// Register graph store service
container.register<IGraphStoreService>('IGraphStoreService', {
  useFactory: (c) => {
    const storagePath = join(homedir(), '.shep', 'memory', 'graphs');
    return new GraphStoreService(storagePath);
  },
});

// Register memory service (depends on interfaces)
container.registerSingleton<IMemoryService>('IMemoryService', { useClass: MemoryService });
```

**Update MemoryService constructor:**

```typescript
export class MemoryService implements IMemoryService {
  constructor(
    @inject('IEmbeddingService') private embedding: IEmbeddingService,
    @inject('IVectorStoreService') private vectorStore: IVectorStoreService,
    @inject('IGraphStoreService') private graphStore: IGraphStoreService
  ) {}
}
```

**Deliverable:** All memory services registered in DI container with interface-based injection.

---

### Phase 8: Agent Integration (TDD CYCLE)

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
  - `retrieveMemoryNode`: Inject `IMemoryService`, query for context, inject into prompt
  - `storeMemoryNode`: Create episode from state, call `IMemoryService.store()`

**Create:**

- `src/infrastructure/services/agents/langgraph/nodes/retrieve-memory.node.ts`
- `src/infrastructure/services/agents/langgraph/nodes/store-memory.node.ts`

**Inject via DI:**

```typescript
constructor(
  @inject('IMemoryService') private memoryService: IMemoryService
) {}
```

#### REFACTOR: Improve Code Quality

- Extract memory context formatting to utility
- Add configurable context window size
- Optimize memory retrieval latency
- Add telemetry for memory operations

**Deliverable:** Agent integration with passing tests, memory working in agent execution.

---

### Phase 9: Configuration & Settings (TDD CYCLE)

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

  - Add `memory?: MemoryConfig` field
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

### Phase 10: Documentation

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

| File                                                                                       | Purpose                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------- |
| `tsp/domain/entities/memory/episode.tsp`                                                   | Episode entity (main memory unit)      |
| `tsp/domain/entities/memory/memory-node.tsp`                                               | Graph node entity                      |
| `tsp/domain/entities/memory/memory-edge.tsp`                                               | Graph relationship entity              |
| `tsp/domain/entities/memory/memory-fragment.tsp`                                           | Conversation snippet entity            |
| `tsp/common/enums/memory-scope.tsp`                                                        | Global vs Feature-specific enum        |
| `tsp/common/enums/memory-type.tsp`                                                         | Episode type enum                      |
| `src/application/ports/output/embedding-service.interface.ts`                              | Embedding service port interface       |
| `src/application/ports/output/vector-store-service.interface.ts`                           | Vector store service port interface    |
| `src/application/ports/output/graph-store-service.interface.ts`                            | Graph store service port interface     |
| `src/application/ports/output/memory-service.interface.ts`                                 | Memory service port interface          |
| `src/infrastructure/services/memory/embedding.service.ts`                                  | Transformers.js embedding service      |
| `src/infrastructure/services/memory/vector-store.service.ts`                               | LanceDB vector storage                 |
| `src/infrastructure/services/memory/graph-store.service.ts`                                | Quadstore graph storage                |
| `src/infrastructure/services/memory/memory.service.ts`                                     | High-level memory orchestration        |
| `src/infrastructure/services/memory/config/memory-config.validator.ts`                     | Config validation                      |
| `src/infrastructure/services/agents/langgraph/nodes/retrieve-memory.node.ts`               | Memory retrieval LangGraph node        |
| `src/infrastructure/services/agents/langgraph/nodes/store-memory.node.ts`                  | Memory storage LangGraph node          |
| `tests/unit/infrastructure/services/memory/embedding.service.test.ts`                      | Embedding service unit tests           |
| `tests/integration/infrastructure/services/memory/vector-store.service.test.ts`            | Vector store integration tests         |
| `tests/integration/infrastructure/services/memory/graph-store.service.test.ts`             | Graph store integration tests          |
| `tests/unit/infrastructure/services/memory/memory.service.test.ts`                         | Memory service unit tests              |
| `tests/integration/infrastructure/services/memory/memory.service.integration.test.ts`      | Memory service integration tests       |
| `tests/integration/infrastructure/agents/memory-integration.test.ts`                       | Agent memory integration tests         |
| `tests/e2e/cli/agent-memory.test.ts`                                                       | CLI agent memory E2E tests             |
| `tests/unit/application/ports/output/embedding-service.interface.test.ts` (contract tests) | Embedding service contract tests       |
| `tests/unit/application/ports/output/vector-store-service.interface.test.ts`               | Vector store service contract tests    |
| `tests/unit/application/ports/output/graph-store-service.interface.test.ts`                | Graph store service contract tests     |
| `tests/unit/application/ports/output/memory-service.interface.test.ts`                     | Memory service contract tests          |
| `docs/memory/architecture.md`                                                              | Memory architecture documentation      |
| `docs/memory/configuration.md`                                                             | Memory configuration guide             |
| `docs/memory/api-reference.md`                                                             | API reference documentation            |
| `docs/memory/port-interfaces.md`                                                           | Port interface contracts documentation |

### Modified Files

| File                                                                       | Changes                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------- |
| `tsp/domain/entities/settings.tsp`                                         | Add `memory: MemoryConfig` field                          |
| `src/infrastructure/di/container.ts`                                       | Register memory services via interface injection          |
| `src/infrastructure/services/agents/langgraph/analyze-repository-graph.ts` | Add memory nodes to graph (retrieve + store)              |
| `src/infrastructure/services/settings.service.ts`                          | Load memory configuration from settings                   |
| `package.json`                                                             | Add dependencies: `@xenova/transformers`, `lancedb`, etc. |
| `src/application/ports/output/index.ts`                                    | Export all memory service interfaces                      |
| `CLAUDE.md`                                                                | Document memory layer architecture with port-based design |
| `README.md`                                                                | Add memory system overview with interface-based approach  |

---

## Testing Strategy

### Unit Tests

**Port Interface Contract Tests:**

- Verify interface contracts (methods, parameters, return types)
- Document expected behavior for implementers
- No actual implementation testing (pure contracts)

**Embedding Service:**

- Embedding generation (mock Transformers.js pipeline)
- Batch processing with mocked models
- Error handling (invalid input, model loading failures)
- Lazy initialization
- **Mock interface:** `IEmbeddingService` for consumers

**Memory Service:**

- Store orchestration (mock all interface dependencies)
- Retrieve hybrid logic (mock vector + graph results)
- Pruning logic (mock deletions)
- Scoping logic (global vs feature)
- **Mock interfaces:** `IEmbeddingService`, `IVectorStoreService`, `IGraphStoreService`

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
- **Verify:** Implements `IVectorStoreService` correctly

**Graph Store Service:**

- Triple storage in real Quadstore (temp directory)
- SPARQL query execution
- Graph traversal for related episodes
- Named graph isolation (global vs feature)
- Persistence across restarts
- **Verify:** Implements `IGraphStoreService` correctly

**Memory Service Integration:**

- End-to-end store + retrieve flow with real dependencies
- Hybrid retrieval accuracy (semantic + graph)
- Scoping isolation
- **Inject:** Real implementations via DI container

**Agent Memory Integration:**

- Agent stores episode after task completion
- Agent retrieves context before new task
- Feature-specific memory isolation
- **Inject:** `IMemoryService` via DI

### E2E Tests

**CLI Agent Memory:**

- Run agent via CLI, verify memory stored
- Run agent again, verify context retrieved
- Verify feature-specific memory isolated from global
- **Test:** Full stack with DI container

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
| **Interface breaking changes**          | Version interfaces, maintain backward compatibility, use contract tests to detect breaking changes         |

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
   pnpm remove @xenova/transformers @lancedb/lancedb apache-arrow quadstore level
   ```

5. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   ```

**Data loss risk:** Memory data will be lost if storage is cleaned. Backup `~/.shep/memory/` before rollback if data recovery is needed.

---

_Implementation plan complete — see tasks.md for detailed breakdown_
