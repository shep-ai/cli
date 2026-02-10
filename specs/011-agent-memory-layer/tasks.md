# Tasks: agent-memory-layer

> Task breakdown for 011-agent-memory-layer

## Status

- **Phase:** Implementation
- **Updated:** 2026-02-10

## Task 1: Foundation & TypeSpec Models

**Phase:** Foundation (NO TESTS)

- [ ] Create directory structure: `mkdir -p ~/.shep/memory/{vectors,graphs,models}/embeddings` with 0700 permissions
- [ ] Create TypeSpec domain models directory: `mkdir -p tsp/domain/entities/memory`
- [ ] Create `tsp/domain/entities/memory/episode.tsp` - Episode entity (content, timestamp, scope, type)
- [ ] Create `tsp/domain/entities/memory/memory-node.tsp` - Graph node entity
- [ ] Create `tsp/domain/entities/memory/memory-edge.tsp` - Graph edge entity (relationship)
- [ ] Create `tsp/domain/entities/memory/memory-fragment.tsp` - Conversation snippet entity
- [ ] Create `tsp/common/enums/memory-scope.tsp` - MemoryScope enum (Global, Feature)
- [ ] Create `tsp/common/enums/memory-type.tsp` - MemoryType enum (Conversation, Decision, Pattern, Learning)
- [ ] Run `pnpm tsp:compile` to generate TypeScript types
- [ ] Verify types generated in `src/domain/generated/output.ts`
- [ ] Commit: "feat(tsp): add memory layer domain models"

**Acceptance:**

- ✅ Directory structure created with correct permissions
- ✅ All TypeSpec files created and compile successfully
- ✅ Types available in generated output

---

## Task 2: IEmbeddingService Port Interface

**Phase:** Application Layer (Port Interfaces)

- [ ] Create `src/application/ports/output/embedding-service.interface.ts`
- [ ] Define `IEmbeddingService` interface with methods:
  - `generateEmbedding(text: string): Promise<number[]>`
  - `generateBatch(texts: string[]): Promise<number[][]>`
- [ ] Add JSDoc documentation for interface and all methods
- [ ] Add type definition for embedding vector: `type EmbeddingVector = number[]`
- [ ] Export interface from `src/application/ports/output/index.ts`
- [ ] Commit: "feat(ports): define IEmbeddingService interface"

**Acceptance:**

- ✅ Interface defined with clear method signatures
- ✅ JSDoc explains purpose and parameters
- ✅ Exported from ports index

---

## Task 3: IVectorStoreService Port Interface

**Phase:** Application Layer (Port Interfaces)

- [ ] Create `src/application/ports/output/vector-store-service.interface.ts`
- [ ] Define `VectorSearchResult` type
- [ ] Define `IVectorStoreService` interface with methods:
  - `upsert(episode: Episode, embedding: number[]): Promise<void>`
  - `search(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]>`
  - `searchByScope(queryEmbedding: number[], scope: MemoryScope, limit: number): Promise<VectorSearchResult[]>`
  - `delete(episodeId: string): Promise<void>`
- [ ] Add JSDoc documentation for interface and all methods
- [ ] Export interface from `src/application/ports/output/index.ts`
- [ ] Commit: "feat(ports): define IVectorStoreService interface"

**Acceptance:**

- ✅ Interface defined with clear method signatures
- ✅ Search result type properly defined
- ✅ JSDoc complete

---

## Task 4: IGraphStoreService Port Interface

**Phase:** Application Layer (Port Interfaces)

- [ ] Create `src/application/ports/output/graph-store-service.interface.ts`
- [ ] Define `SparqlResult` type: `Record<string, string>`
- [ ] Define `IGraphStoreService` interface with methods:
  - `addTriple(subject: string, predicate: string, object: string, scope: MemoryScope): Promise<void>`
  - `query(sparql: string, scope?: MemoryScope): Promise<SparqlResult[]>`
  - `getRelatedEpisodes(episodeId: string, scope?: MemoryScope, depth?: number): Promise<string[]>`
  - `removeEpisode(episodeId: string): Promise<void>`
- [ ] Add JSDoc documentation for interface and all methods
- [ ] Export interface from `src/application/ports/output/index.ts`
- [ ] Commit: "feat(ports): define IGraphStoreService interface"

**Acceptance:**

- ✅ Interface defined with clear method signatures
- ✅ SPARQL result type properly defined
- ✅ JSDoc complete

---

## Task 5: IMemoryService Port Interface

**Phase:** Application Layer (Port Interfaces)

- [ ] Create `src/application/ports/output/memory-service.interface.ts`
- [ ] Define `IMemoryService` interface with methods:
  - `store(episode: Episode): Promise<void>`
  - `retrieve(query: string, topK: number, scope?: MemoryScope): Promise<Episode[]>`
  - `pruneOldMemories(retentionDays: number): Promise<void>`
- [ ] Add JSDoc documentation for interface and all methods
- [ ] Document hybrid retrieval behavior (semantic + graph)
- [ ] Export interface from `src/application/ports/output/index.ts`
- [ ] Commit: "feat(ports): define IMemoryService interface"

**Acceptance:**

- ✅ Interface defined with clear method signatures
- ✅ Hybrid retrieval documented
- ✅ JSDoc complete

---

## Task 6: Embedding Service - RED (Write Tests)

**Phase:** Embedding Service (TDD - RED)

- [ ] Create test file: `tests/unit/infrastructure/services/memory/embedding.service.test.ts`
- [ ] Install test dependencies: `pnpm add -D @types/node`
- [ ] Write failing test: `generateEmbedding()` should generate 384-dim vector for "test input"
- [ ] Write failing test: `generateBatch()` should batch process array of texts
- [ ] Write failing test: `initialize()` should lazy load model on first call
- [ ] Write failing test: Error handling for empty string input
- [ ] Write failing test: Error handling for null input
- [ ] Mock `@xenova/transformers` pipeline (avoid model downloads)
- [ ] Run tests: `pnpm test:unit` - Verify all tests fail ❌
- [ ] Commit: "test(memory): add failing tests for embedding service"

**Acceptance:**

- ✅ All 5 tests written and failing
- ✅ Test output shows clear failure messages

---

## Task 7: Embedding Service - GREEN (Implementation)

**Phase:** Embedding Service (TDD - GREEN)

- [ ] Install dependencies: `pnpm add @xenova/transformers`
- [ ] Create `src/infrastructure/services/memory/embedding.service.ts`
- [ ] Implement `EmbeddingService implements IEmbeddingService`
- [ ] Implement `initialize()` - Lazy load Transformers.js pipeline (mixedbread-ai/mxbai-embed-xsmall-v1)
- [ ] Implement `generateEmbedding(text: string): Promise<number[]>` - Return 384-dim vector
- [ ] Implement `generateBatch(texts: string[]): Promise<number[][]>` - Batch processing
- [ ] Add error handling for empty/null inputs
- [ ] Configure model cache path: `~/.shep/memory/models/embeddings/`
- [ ] Run tests: `pnpm test:unit` - Verify all tests pass ✅
- [ ] Commit: "feat(memory): implement EmbeddingService implementing IEmbeddingService"

**Acceptance:**

- ✅ All embedding service tests passing
- ✅ Class implements IEmbeddingService interface
- ✅ Minimal code to pass tests

---

## Task 8: Embedding Service - REFACTOR (Improve)

**Phase:** Embedding Service (TDD - REFACTOR)

- [ ] Extract model configuration to constants (MODEL_NAME, EMBEDDING_DIM, CACHE_DIR)
- [ ] Add JSDoc documentation for all public methods
- [ ] Add progress logging for batch operations (console.log for >10 texts)
- [ ] Optimize batch size (chunk arrays > 100 texts into batches of 32)
- [ ] Add unit test for batch size optimization
- [ ] Run tests: `pnpm test:unit` - Verify tests still pass ✅
- [ ] Run linter: `pnpm lint:fix`
- [ ] Commit: "refactor(memory): optimize embedding service batch processing"

**Acceptance:**

- ✅ All tests still passing after refactoring
- ✅ Code is cleaner and well-documented
- ✅ No linting errors

---

## Task 9: Vector Store Service - RED (Write Tests)

**Phase:** Vector Storage (TDD - RED)

- [ ] Create test file: `tests/integration/infrastructure/services/memory/vector-store.service.test.ts`
- [ ] Set up temp directory for LanceDB in beforeEach
- [ ] Write failing test: `upsert()` should store episode with embedding
- [ ] Write failing test: `search()` should retrieve top-5 similar episodes
- [ ] Write failing test: `searchByScope()` should filter by MemoryScope.Global
- [ ] Write failing test: `delete()` should remove episode from vector store
- [ ] Write failing test: File persistence - restart service, verify data still exists
- [ ] Clean up temp directory in afterEach
- [ ] Run tests: `pnpm test:int` - Verify all tests fail ❌
- [ ] Commit: "test(memory): add failing tests for vector store service"

**Acceptance:**

- ✅ All 5 integration tests written and failing
- ✅ Temp directory cleanup working

---

## Task 10: Vector Store Service - GREEN (Implementation)

**Phase:** Vector Storage (TDD - GREEN)

- [ ] Install dependencies: `pnpm add @lancedb/lancedb apache-arrow`
- [ ] Create `src/infrastructure/services/memory/vector-store.service.ts`
- [ ] Implement `VectorStoreService implements IVectorStoreService`
- [ ] Define table schema: `{id: string, episodeId: string, embedding: vector(384), scope: string, createdAt: timestamp}`
- [ ] Implement `upsert(episode: Episode, embedding: number[]): Promise<void>`
- [ ] Implement `search(query: number[], topK: number, scope?: MemoryScope): Promise<Episode[]>`
- [ ] Implement `delete(episodeId: string): Promise<void>`
- [ ] Store data in `~/.shep/memory/vectors/{scope}/` directory structure
- [ ] Run tests: `pnpm test:int` - Verify all tests pass ✅
- [ ] Commit: "feat(memory): implement VectorStoreService implementing IVectorStoreService"

**Acceptance:**

- ✅ All vector store integration tests passing
- ✅ Class implements IVectorStoreService interface
- ✅ Data persists to disk correctly

---

## Task 11: Vector Store Service - REFACTOR (Improve)

**Phase:** Vector Storage (TDD - REFACTOR)

- [ ] Extract table schema to constants
- [ ] Add connection pooling (reuse LanceDB connections)
- [ ] Optimize index parameters for search speed (configure IVF-PQ if available)
- [ ] Add metadata filtering support (filter by createdAt range)
- [ ] Add JSDoc documentation
- [ ] Add integration test for metadata filtering
- [ ] Run tests: `pnpm test:int` - Verify tests still pass ✅
- [ ] Commit: "refactor(memory): optimize vector store with connection pooling"

**Acceptance:**

- ✅ All tests passing after refactoring
- ✅ Search performance < 50ms for 1000 vectors

---

## Task 12: Graph Store Service - RED (Write Tests)

**Phase:** Graph Storage (TDD - RED)

- [ ] Create test file: `tests/integration/infrastructure/services/memory/graph-store.service.test.ts`
- [ ] Set up temp directory for Quadstore LevelDB in beforeEach
- [ ] Write failing test: `addTriple()` should store RDF triple
- [ ] Write failing test: `query()` should execute SPARQL SELECT query
- [ ] Write failing test: `getRelatedEpisodes()` should traverse graph to find related episodes
- [ ] Write failing test: `removeEpisode()` should delete episode and related triples
- [ ] Write failing test: Named graphs - isolate shep:global from shep:feature:123
- [ ] Write failing test: File persistence across service restarts
- [ ] Clean up temp directory in afterEach
- [ ] Run tests: `pnpm test:int` - Verify all tests fail ❌
- [ ] Commit: "test(memory): add failing tests for graph store service"

**Acceptance:**

- ✅ All 6 integration tests written and failing
- ✅ Temp directory cleanup working

---

## Task 13: Graph Store Service - GREEN (Implementation)

**Phase:** Graph Storage (TDD - GREEN)

- [ ] Install dependencies: `pnpm add quadstore level`
- [ ] Create `src/infrastructure/services/memory/graph-store.service.ts`
- [ ] Implement `GraphStoreService implements IGraphStoreService`
- [ ] Implement `addTriple(subject, predicate, object, graph?): Promise<void>`
- [ ] Implement `query(sparql: string): Promise<any[]>` - Execute SPARQL queries
- [ ] Implement `getRelatedEpisodes(episodeId: string, scope?: MemoryScope): Promise<string[]>` - Graph traversal
- [ ] Implement `removeEpisode(episodeId: string): Promise<void>` - Delete triples
- [ ] Set up named graphs: `shep:global` and `shep:feature:{id}`
- [ ] Store data in `~/.shep/memory/graphs/{scope}/` directory
- [ ] Run tests: `pnpm test:int` - Verify all tests pass ✅
- [ ] Commit: "feat(memory): implement GraphStoreService implementing IGraphStoreService"

**Acceptance:**

- ✅ All graph store integration tests passing
- ✅ Class implements IGraphStoreService interface
- ✅ Named graphs isolate data correctly

---

## Task 14: Graph Store Service - REFACTOR (Improve)

**Phase:** Graph Storage (TDD - REFACTOR)

- [ ] Create SPARQL query builder utility (`buildGetRelatedQuery()`, `buildDeleteQuery()`)
- [ ] Add graph schema constants (predicates: `shep:hasContext`, `shep:followsFrom`, `shep:relatesTo`)
- [ ] Extract graph URIs to constants (`GLOBAL_GRAPH_URI`, `FEATURE_GRAPH_PREFIX`)
- [ ] Add bulk insert optimization (batch multiple triples)
- [ ] Add JSDoc documentation
- [ ] Add integration test for bulk insert
- [ ] Run tests: `pnpm test:int` - Verify tests still pass ✅
- [ ] Commit: "refactor(memory): add SPARQL query builder and bulk operations"

**Acceptance:**

- ✅ All tests passing after refactoring
- ✅ Query latency < 100ms for typical graph traversals

---

## Task 15: Memory Service - RED (Write Tests)

**Phase:** Memory Orchestration (TDD - RED)

- [ ] Create test file: `tests/unit/infrastructure/services/memory/memory.service.test.ts`
- [ ] Mock `IEmbeddingService`, `IVectorStoreService`, `IGraphStoreService` (use interfaces!)
- [ ] Write failing test: `store()` should call embedding.generate() → vector.upsert() → graph.addTriple()
- [ ] Write failing test: `retrieve()` should perform hybrid retrieval (vector search + graph expansion)
- [ ] Write failing test: `retrieveByScope()` should respect MemoryScope filter
- [ ] Write failing test: `pruneOldMemories()` should delete memories older than 90 days
- [ ] Write failing test: Error handling - embedding failure should not block storage
- [ ] Run tests: `pnpm test:unit` - Verify all tests fail ❌
- [ ] Commit: "test(memory): add failing tests for memory service orchestration"

**Acceptance:**

- ✅ All 5 unit tests written and failing
- ✅ Dependencies properly mocked using interfaces

---

## Task 16: Memory Service - GREEN (Implementation)

**Phase:** Memory Orchestration (TDD - GREEN)

- [ ] Create `src/infrastructure/services/memory/memory.service.ts`
- [ ] Implement `MemoryService implements IMemoryService`
- [ ] Add constructor with `@inject` decorators for interfaces:
  - `@inject('IEmbeddingService') private embedding: IEmbeddingService`
  - `@inject('IVectorStoreService') private vectorStore: IVectorStoreService`
  - `@inject('IGraphStoreService') private graphStore: IGraphStoreService`
- [ ] Implement `store(episode: Episode): Promise<void>` - Orchestrate embedding → vector → graph
- [ ] Implement `retrieve(query: string, topK: number, scope?: MemoryScope): Promise<Episode[]>` - Hybrid retrieval
- [ ] Hybrid retrieval logic: (1) Generate query embedding, (2) Vector search, (3) Graph expansion, (4) Re-rank
- [ ] Implement `pruneOldMemories(retentionDays: number): Promise<void>` - Delete old episodes
- [ ] Add error handling (log errors, continue execution)
- [ ] Run tests: `pnpm test:unit` - Verify all tests pass ✅
- [ ] Commit: "feat(memory): implement MemoryService implementing IMemoryService"

**Acceptance:**

- ✅ All memory service unit tests passing
- ✅ Class implements IMemoryService interface
- ✅ Dependencies injected via interfaces
- ✅ Hybrid retrieval combines semantic + graph results

---

## Task 17: Memory Service - Integration Tests

**Phase:** Memory Orchestration (TDD - Integration)

- [ ] Create test file: `tests/integration/infrastructure/services/memory/memory.service.integration.test.ts`
- [ ] Set up temp directories for LanceDB + Quadstore
- [ ] Write test: End-to-end store + retrieve flow with real dependencies
- [ ] Write test: Hybrid retrieval returns accurate results (semantic + graph)
- [ ] Write test: Scoping isolation (global vs feature)
- [ ] Create 10 test episodes with relationships
- [ ] Verify retrieval returns top-5 most relevant episodes
- [ ] Clean up temp directories in afterEach
- [ ] Run tests: `pnpm test:int` - Verify all tests pass ✅
- [ ] Commit: "test(memory): add integration tests for memory service"

**Acceptance:**

- ✅ End-to-end flow working with real storage
- ✅ Hybrid retrieval accuracy validated

---

## Task 18: Memory Service - REFACTOR (Improve)

**Phase:** Memory Orchestration (TDD - REFACTOR)

- [ ] Extract hybrid retrieval logic to private method `_hybridRetrieve()`
- [ ] Add in-memory cache for recent queries (LRU cache, max 100 entries)
- [ ] Optimize graph traversal depth (limit to 2 hops by default)
- [ ] Add metrics/logging for retrieval performance (log latency)
- [ ] Add unit test for caching behavior
- [ ] Run tests: `pnpm test` - Verify all tests still pass ✅
- [ ] Commit: "refactor(memory): optimize memory service with caching"

**Acceptance:**

- ✅ All tests passing after refactoring
- ✅ Retrieval latency < 300ms for typical queries

---

## Task 19: DI Container Registration

**Phase:** Dependency Injection (Infrastructure)

- [ ] Open `src/infrastructure/di/container.ts`
- [ ] Register `IEmbeddingService` → `EmbeddingService` (singleton)
- [ ] Register `IVectorStoreService` → `VectorStoreService` (factory with storage path)
- [ ] Register `IGraphStoreService` → `GraphStoreService` (factory with storage path)
- [ ] Register `IMemoryService` → `MemoryService` (singleton, dependencies auto-injected)
- [ ] Add imports for all memory services and interfaces
- [ ] Run build: `pnpm build` - Verify DI container compiles ✅
- [ ] Commit: "feat(di): register memory services with interface injection"

**Acceptance:**

- ✅ All memory services registered in DI container
- ✅ Interface-based injection configured
- ✅ Build succeeds without errors

---

## Task 20: Agent Integration - RED (Write Tests)

**Phase:** Agent Integration (TDD - RED)

- [ ] Create test file: `tests/integration/infrastructure/agents/memory-integration.test.ts`
- [ ] Write failing test: Agent stores episode after completing task
- [ ] Write failing test: Agent retrieves relevant context before starting new task
- [ ] Write failing test: Memory scoping - feature-specific context not leaked to global
- [ ] Create test file: `tests/e2e/cli/agent-memory.test.ts`
- [ ] Write failing E2E test: CLI agent run stores conversation in memory
- [ ] Write failing E2E test: Subsequent run retrieves previous context
- [ ] Write failing E2E test: Feature-specific memory isolated
- [ ] Run tests: `pnpm test:int && pnpm test:e2e` - Verify all tests fail ❌
- [ ] Commit: "test(memory): add failing tests for agent memory integration"

**Acceptance:**

- ✅ All 6 integration/E2E tests written and failing
- ✅ Test scenarios cover full agent lifecycle

---

## Task 21: Agent Integration - GREEN (Implementation)

**Phase:** Agent Integration (TDD - GREEN)

- [ ] Create `src/infrastructure/services/agents/langgraph/nodes/retrieve-memory.node.ts`
- [ ] Implement `retrieveMemoryNode` - Inject `IMemoryService`, query for context, inject into state
- [ ] Create `src/infrastructure/services/agents/langgraph/nodes/store-memory.node.ts`
- [ ] Implement `storeMemoryNode` - Create Episode from state, call `IMemoryService.store()`
- [ ] Modify `src/infrastructure/services/agents/langgraph/analyze-repository-graph.ts`:
  - Add `retrieveMemory` node
  - Add `storeMemory` node
  - Update edges: `START → retrieveMemory → analyze → storeMemory → END`
  - Inject `IMemoryService` via DI: `@inject('IMemoryService') private memoryService: IMemoryService`
- [ ] Run tests: `pnpm test:int && pnpm test:e2e` - Verify all tests pass ✅
- [ ] Commit: "feat(memory): integrate memory service into LangGraph agents"

**Acceptance:**

- ✅ All agent integration tests passing
- ✅ Memory nodes integrated into graph
- ✅ Dependencies injected via IMemoryService interface

---

## Task 22: Agent Integration - REFACTOR (Improve)

**Phase:** Agent Integration (TDD - REFACTOR)

- [ ] Extract memory context formatting to utility (`formatMemoryContext()`)
- [ ] Add configurable context window size (default: top-5 episodes)
- [ ] Optimize memory retrieval latency (add timeout, fallback to empty context)
- [ ] Add telemetry for memory operations (log retrieval count, latency)
- [ ] Add integration test for timeout behavior
- [ ] Run tests: `pnpm test` - Verify tests still pass ✅
- [ ] Commit: "refactor(memory): optimize agent memory integration"

**Acceptance:**

- ✅ All tests passing after refactoring
- ✅ Memory retrieval has timeout protection

---

## Task 23: Configuration & Settings - RED (Write Tests)

**Phase:** Configuration (TDD - RED)

- [ ] Create test file: `tests/unit/infrastructure/services/memory/memory-config.test.ts`
- [ ] Write failing test: Default configuration should use Transformers.js
- [ ] Write failing test: Optional Ollama configuration should override embedding service
- [ ] Write failing test: Retention policy should apply correctly (90 days default)
- [ ] Write failing test: Storage paths should be configurable
- [ ] Run tests: `pnpm test:unit` - Verify all tests fail ❌
- [ ] Commit: "test(memory): add failing tests for memory configuration"

**Acceptance:**

- ✅ All 4 configuration tests written and failing

---

## Task 24: Configuration & Settings - GREEN (Implementation)

**Phase:** Configuration (TDD - GREEN)

- [ ] Modify `tsp/domain/entities/settings.tsp`:
  - Add `memory?: MemoryConfig` field
  - Define `MemoryConfig` model: embeddingProvider (Transformers | Ollama), retentionDays, storagePath, enableMemory
- [ ] Run `pnpm tsp:compile` to regenerate types
- [ ] Create `src/infrastructure/services/memory/config/memory-config.validator.ts`
- [ ] Implement config validation (validate storage path, retention days > 0)
- [ ] Modify `src/infrastructure/services/settings.service.ts` if needed
- [ ] Update DI container to read memory config from settings
- [ ] Run tests: `pnpm test:unit` - Verify all tests pass ✅
- [ ] Commit: "feat(memory): add memory configuration to settings"

**Acceptance:**

- ✅ All configuration tests passing
- ✅ Memory config integrated into settings

---

## Task 25: Configuration & Settings - REFACTOR (Improve)

**Phase:** Configuration (TDD - REFACTOR)

- [ ] Add validation for storage path (must be absolute, writable)
- [ ] Add unit test for path validation
- [ ] Add CLI command stub: `shep memory stats` (show storage size, episode count)
- [ ] Add JSDoc documentation for MemoryConfig
- [ ] Run tests: `pnpm test` - Verify tests still pass ✅
- [ ] Commit: "refactor(memory): add memory config validation and CLI stats command"

**Acceptance:**

- ✅ All tests passing
- ✅ Config validation robust

---

## Task 26: Documentation

**Phase:** Documentation (NO TESTS)

- [ ] Create `docs/memory/architecture.md` - System architecture overview (copy from plan.md, update with port interfaces)
- [ ] Create `docs/memory/configuration.md` - Configuration guide (Transformers.js vs Ollama)
- [ ] Create `docs/memory/api-reference.md` - Port interfaces documentation (IMemoryService, etc.)
- [ ] Create `docs/memory/port-interfaces.md` - Explain Clean Architecture ports pattern
- [ ] Update `README.md` - Add "Memory Layer" section with overview and architecture diagram
- [ ] Update `CLAUDE.md` - Add memory layer architecture section with port interfaces
- [ ] Add inline code examples to docs
- [ ] Commit: "docs(memory): add comprehensive memory layer documentation"

**Acceptance:**

- ✅ All documentation files created
- ✅ CLAUDE.md and README.md updated
- ✅ Port interfaces documented

---

## Task 27: Final Validation

**Phase:** Validation (NO TESTS - CI Verification)

- [ ] Run full test suite: `pnpm test` - All tests must pass ✅
- [ ] Run linter: `pnpm lint` - No errors ✅
- [ ] Run type checker: `pnpm typecheck` - No errors ✅
- [ ] Run build: `pnpm build` - Build succeeds ✅
- [ ] Manual test: Create episode, retrieve it (CLI or script)
- [ ] Check storage: Verify files created in `~/.shep/memory/`
- [ ] Verify DI container resolves all interfaces correctly
- [ ] Update `specs/011-agent-memory-layer/spec.md` status to "Complete"
- [ ] Update `specs/011-agent-memory-layer/research.md` status to "Complete"
- [ ] Update `specs/011-agent-memory-layer/plan.md` status to "Complete"
- [ ] Update `specs/011-agent-memory-layer/tasks.md` status to "Complete"
- [ ] Update `specs/011-agent-memory-layer/feature.yaml`:
  - Set `lifecycle: 'review'`
  - Set `status.phase: 'ready-for-review'`
  - Set `status.progress.completed: 27`
  - Set `status.progress.total: 27`
  - Set `status.progress.percentage: 100`
  - Add checkpoint: `{phase: 'implementation-complete', completedAt: '<timestamp>', completedBy: 'shep-kit:implement'}`
- [ ] Commit: "feat(specs): mark 011-agent-memory-layer as complete"

**Acceptance:**

- ✅ All validation checks passing
- ✅ Feature ready for code review
- ✅ All spec files updated to "Complete" status
- ✅ Port-based architecture fully implemented

---

## Parallelization Notes

Tasks that CAN be executed in parallel:

- **Phase 2 (Port Interfaces)**: After Task 1 complete, Tasks 2-5 can run in parallel (all port interfaces)
- **Phase 3-5 (Service Implementations)**: After Tasks 2-5 complete, Tasks 6-14 can be split into 3 parallel streams:
  - Stream A: Tasks 6-8 (Embedding Service)
  - Stream B: Tasks 9-11 (Vector Store Service)
  - Stream C: Tasks 12-14 (Graph Store Service)

Tasks that MUST run sequentially:

- Task 1 (Foundation) → MUST complete first
- Tasks 2-5 (Port Interfaces) → Depend on Task 1, but can run in parallel with each other
- Tasks 6-14 (Service Implementations) → Depend on Tasks 2-5
- Tasks 15-18 (Memory Service) → Depend on Tasks 6-14
- Task 19 (DI Registration) → Depends on Tasks 15-18
- Tasks 20-22 (Agent Integration) → Depend on Task 19
- Tasks 23-25 (Configuration) → Depend on Tasks 20-22
- Task 26 (Documentation) → Can run in parallel with Task 25
- Task 27 (Validation) → MUST be last

---

## Acceptance Checklist

Before marking feature complete:

- [ ] All 27 tasks completed
- [ ] Tests passing (`pnpm test`) - 100% pass rate
- [ ] Linting clean (`pnpm lint`) - 0 errors
- [ ] Types valid (`pnpm typecheck`) - 0 errors
- [ ] Build succeeds (`pnpm build`) - Clean build
- [ ] All services implement their respective port interfaces
- [ ] DI container uses interface-based injection
- [ ] Documentation updated (architecture, port interfaces, configuration, API reference)
- [ ] CLAUDE.md updated with port-based memory architecture
- [ ] README.md updated with memory overview and Clean Architecture approach
- [ ] PR created and reviewed
- [ ] CI pipeline passing (all jobs green)
- [ ] Feature yaml updated to lifecycle: 'review'

---

**Key Architectural Principles (Enforced):**

1. ✅ Port interfaces defined BEFORE implementations
2. ✅ All services implement their port interfaces
3. ✅ Dependencies injected via interfaces, not concrete classes
4. ✅ DI container registers interface → implementation mappings
5. ✅ Tests mock interfaces, not concrete implementations
6. ✅ Follows Clean Architecture dependency rule (dependencies point inward)

---

_Task breakdown for Clean Architecture implementation tracking_
