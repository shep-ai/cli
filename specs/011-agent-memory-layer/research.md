# Research: agent-memory-layer

> Technical analysis for 011-agent-memory-layer

## Status

- **Phase:** Research
- **Updated:** 2026-02-09

## Technology Decisions

### 1. Graph Database Backend

**Options considered:**

1. **[Graphiti](https://github.com/getzep/graphiti) + [FalkorDB](https://www.falkordb.com/)** - Purpose-built temporal knowledge graph with lightweight graph DB ([Docs](https://docs.falkordb.com/agentic-memory/graphiti.html))
2. **[Graphiti](https://github.com/getzep/graphiti) + [Neo4j](https://neo4j.com/)** - Mature graph database, heavier infrastructure footprint ([Comparison](https://www.falkordb.com/blog/falkordb-vs-neo4j-for-ai-applications/))
3. **[MemoryGraph](https://github.com/gregorydickson/memory-graph) + SQLite** - SQLite-native alternative designed for codebase memory ([Comparison](https://dev.to/gregory_dickson_6dd6e2b55/memorygraph-vs-graphiti-choosing-the-right-memory-for-your-ai-agent-526k))
4. **Custom implementation** - Build graph memory layer on top of SQLite

**Decision:** [Graphiti](https://github.com/getzep/graphiti) + [FalkorDB](https://www.falkordb.com/) (Docker-based)

**Rationale:**

- [Graphiti](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/) is **purpose-built for agent memory** with temporal knowledge graphs, exactly matching our use case
- [FalkorDB achieves **500x faster P99 latency**](https://www.falkordb.com/blog/graph-database-performance-benchmarks-falkordb-vs-neo4j/) than Neo4j, optimized for AI/GraphRAG workloads
- Docker deployment is **acceptable for developer tooling** (simpler than Neo4j cluster setup)
- **No SQLite support** in Graphiti (requires graph database), but performance benefits justify the tradeoff
- [MemoryGraph](https://github.com/gregorydickson/memory-graph) is designed for codebase memory, not conversational agent memory
- Custom implementation would require significant effort and reinvent proven architecture

**Infrastructure impact:** Adds [FalkorDB Docker container](https://docs.falkordb.com/agentic-memory/graphiti.html) + Redis dependency. Can implement graceful degradation (optional memory if Docker unavailable).

### 2. Retrieval Strategy

**Graphiti's built-in approach:**

[Graphiti uses **hybrid search**](https://medium.com/@saeedhajebi/building-ai-agents-with-knowledge-graph-memory-a-comprehensive-guide-to-graphiti-3b77e6084dec) combining:

1. **Semantic search** - Vector embeddings for conceptual similarity
2. **Keyword search (BM25)** - Fast text matching
3. **Graph traversal** - Breadth-first search along relationships

**Decision:** Use [Graphiti's native hybrid retrieval](https://neo4j.com/blog/developer/graphiti-knowledge-graph-memory/) (no custom implementation needed)

**Rationale:**

- Matches user requirement for hybrid approach
- **[P95 latency: 300ms](https://medium.com/neo4j/graphiti-knowledge-graph-memory-for-a-post-rag-agentic-world-0fd2366ba27d)** - Fast enough for real-time interaction
- Near-constant time performance regardless of graph size (indexed lookups)
- Configurable via `SearchConfig` class for fine-tuning

### 3. Memory Scope Implementation

**User requirement:** Hybrid (global + feature-specific memory)

**Decision:** Multi-graph architecture using [Graphiti's multi-tenant support](https://www.falkordb.com/blog/graphiti-falkordb-multi-agent-performance/)

**Implementation:**

- **Global graph** (`shep-global`): User preferences, cross-feature patterns, general learnings
- **Per-feature graphs** (`shep-feature-{id}`): Feature-specific context, task details, isolated conversations
- **Bridge mechanism**: Global graph can reference feature graphs via metadata

**Rationale:**

- [Graphiti supports multiple graphs](https://medium.com/@saeedhajebi/building-ai-agents-with-knowledge-graph-memory-a-comprehensive-guide-to-graphiti-3b77e6084dec) in one instance natively
- Clean separation prevents context pollution
- Flexible queries: agents can search global, feature-specific, or both
- Aligns with Clean Architecture (memory service handles routing)

### 4. Deployment Model

**Options considered:**

1. **Required Docker service** - Always require FalkorDB running
2. **Optional with graceful degradation** - Work without memory if Docker unavailable
3. **Embedded deployment** - Bundle FalkorDB (not feasible with current architecture)

**Decision:** Optional with graceful degradation

**Rationale:**

- CLI should work without Docker for basic use cases
- Power users can opt-in to memory features via Docker setup
- Matches Shep's progressive enhancement philosophy
- Reduces barrier to entry for new users

## Library Analysis

| Library                                                              | Version | Purpose                             | Pros                                                                  | Cons                                                      |
| -------------------------------------------------------------------- | ------- | ----------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| [`graphiti-core[falkordb]`](https://pypi.org/project/graphiti-core/) | Latest  | Temporal knowledge graph for agents | Purpose-built, hybrid search, temporal awareness, active development  | Requires graph DB, not SQLite                             |
| [FalkorDB](https://github.com/FalkorDB/FalkorDB) (Docker)            | ≥1.1.2  | Lightweight graph database          | 500x faster than Neo4j, Docker-simple, AI-optimized, Redis-based      | Docker dependency, separate service                       |
| [LangGraph](https://langchain-ai.github.io/langgraph/) (existing)    | Current | Agent orchestration                 | Already in use, Graphiti integrates with LangGraph StateGraph         | N/A (existing dep)                                        |
| TypeSpec models (to be added)                                        | N/A     | Domain models for memory entities   | Type-safe Episode/Node/Edge models                                    | Requires TypeSpec definitions                             |
| [Pydantic](https://docs.pydantic.dev/) (for custom entities)         | Current | Custom entity type definitions      | Graphiti uses Pydantic for domain-specific entity extraction          | N/A (minimal, Pydantic likely already a transitive dep)   |
| [OpenAI SDK](https://platform.openai.com/docs/libraries) (existing)  | Current | Embedding model for semantic search | Required for Graphiti's vector embeddings (default model: text-ada-2) | API key required, costs per embedding (acceptable for AI) |

## Security Considerations

- **Graph database credentials**: Store FalkorDB connection details securely (consider using existing settings encryption)
- **API key management**: OpenAI API key for embeddings must be stored securely (leverage existing agent config)
- **Memory data privacy**: Conversation history contains potentially sensitive information - implement data retention policies
- **Multi-tenant isolation**: If supporting multiple users, ensure graph access control prevents cross-user data leakage
- **Docker security**: FalkorDB container should not expose ports publicly, bind to localhost only
- **Secret sanitization**: Before storing memories, sanitize any secrets/credentials from conversation text

## Performance Implications

### Latency Targets

- **Retrieval**: P95 latency of 300ms (Graphiti benchmark), well within acceptable range (<1s)
- **Ingestion**: Real-time updates with incremental processing (no batch recomputation needed)
- **Scalability**: Near-constant time access via vector + BM25 indexes, independent of graph size

### Resource Usage

- **Docker overhead**: FalkorDB + Redis containers (~200-500MB RAM baseline)
- **Embedding generation**: LLM API calls add latency (1-2s per episode ingestion) - acceptable for async storage
- **Storage growth**: Graph size grows with agent interactions, implement pruning strategy for old/irrelevant memories
- **Index maintenance**: Vector and BM25 indexes automatically maintained by FalkorDB

### Optimizations

- **Lazy loading**: Only initialize Graphiti connection when memory features are used
- **Connection pooling**: Reuse FalkorDB connections across agent sessions
- **Batch ingestion**: Buffer multiple memory writes for batch processing
- **Cache recent queries**: In-memory cache for frequently accessed memories (e.g., current feature context)

## Answered Questions from Spec

✅ **Does Graphiti require a separate database or use SQLite?**

- Answer: Requires separate graph database (Neo4j, FalkorDB, Kuzu, or Neptune). No SQLite support.
- Decision: Use FalkorDB via Docker for balance of performance and simplicity.

✅ **How does Graphiti handle memory retrieval (semantic search, graph traversal)?**

- Answer: Hybrid approach combining semantic search (vector embeddings), keyword search (BM25), and graph traversal (breadth-first search).
- Decision: Use native hybrid retrieval, configurable via SearchConfig.

✅ **What are the performance implications for large memory graphs?**

- Answer: P95 latency of 300ms, near-constant time via indexes. Scales to thousands of entities without degradation.
- Decision: Target <1s retrieval (near real-time), implement pruning for long-term scalability.

✅ **Should memory be scoped per-feature or globally across all agent interactions?**

- Answer: User requirement confirmed - hybrid approach.
- Decision: Multi-graph architecture (global + per-feature graphs) using Graphiti's multi-tenant support.

✅ **What configuration options does Graphiti expose (embedding models, graph parameters)?**

- Answer: Configurable embedding models (OpenAI default), custom entity types via Pydantic, SearchConfig for retrieval tuning.
- Decision: Use OpenAI embeddings initially, expose configuration via Shep settings (ModelConfiguration).

## Open Questions

All questions resolved during research phase.

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
