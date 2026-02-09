# Research: agent-memory-layer

> Technical analysis for 011-agent-memory-layer

## Status

- **Phase:** Planning
- **Updated:** 2026-02-09

## ⚠️ Critical Constraints

**Shep AI CLI is TypeScript/Node.js** - All solutions MUST be TypeScript-compatible. Python libraries (Graphiti, Kuzu) are NOT viable.

**No API keys allowed** - All solutions MUST be fully self-hosted and local. No cloud APIs (OpenAI, Anthropic, etc.).

## Technology Decisions

### 1. Local Embeddings (No API Keys)

**CRITICAL CONSTRAINT:** No external API keys allowed. Embeddings must run entirely locally.

**Options considered:**

1. **[Transformers.js](https://huggingface.co/docs/transformers.js/)** - HuggingFace models via ONNX Runtime in Node.js/browser ([Apache 2.0](https://www.npmjs.com/package/@xenova/transformers))
2. **[Ollama](https://ollama.com/blog/embedding-models)** - Local LLM server with embeddings API, TypeScript integration via LangChain
3. **OpenAI API** - ❌ **Requires API key and cloud access**

**Decision:** **Transformers.js** for pure Node.js embedding, with **Ollama** as optional enhancement

**Rationale:**

- **Transformers.js advantages:**

  - 100% local execution via ONNX Runtime
  - Zero external dependencies (no servers required)
  - TypeScript-native with `@xenova/transformers` npm package
  - Supports feature-extraction pipeline with models like `mixedbread-ai/mxbai-embed-xsmall-v1`
  - Can disable remote models with `env.allowRemoteModels = false` and use local model path
  - Runs in Node.js process (no separate server)
  - [Active development with Transformers.js 4 announced 2025](https://blog.worldline.tech/2026/01/13/transformersjs-intro.html)

- **Ollama as optional enhancement:**
  - Local LLM server with [embeddings API](https://docs.ollama.com/capabilities/embeddings) (`/api/embed`)
  - [TypeScript integration via LangChain OllamaEmbeddings](https://js.langchain.com/docs/integrations/text_embedding/ollama/)
  - Supports models like `nomic-embed-text` for embeddings
  - Returns L2-normalized (unit-length) vectors
  - Power users can opt-in via configuration
  - Connects to `http://127.0.0.1:11434` by default

**Infrastructure impact:** Transformers.js runs in-process (zero dependencies). Ollama optional for power users who want larger embedding models.

### 2. Vector Database (Local/File-based)

**User requirement:** File-based storage with no Docker required.

**Options considered:**

1. **[LanceDB](https://lancedb.com/)** - Embedded TypeScript vector DB, file-based like SQLite ([Apache 2.0](https://github.com/lancedb/lancedb))
2. **[ChromaDB](https://www.trychroma.com/)** - Local server with TypeScript client ([Apache 2.0](https://github.com/chroma-core/chroma))
3. **[sqlite-vec](https://github.com/asg017/sqlite-vec)** - SQLite extension for vector search ([Apache 2.0](https://github.com/asg017/sqlite-vec))

**Decision:** **LanceDB** (embedded), with **sqlite-vec** as alternative for SQLite integration

**Rationale:**

- **LanceDB advantages:**

  - [Only embedded vector database in Node.js ecosystem](https://lancedb.com/blog/the-future-of-ai-native-development-is-local-inside-continues-lancedb-powered-evolution/)
  - Native TypeScript/JavaScript support (not just a client)
  - File-based storage in a directory (like SQLite for vectors)
  - Fast vector search (billions of vectors in milliseconds)
  - Supports vector similarity, full-text search, and SQL
  - Zero-copy and automatic versioning
  - [Used by Continue (AI coding assistant) and AnythingLLM](https://lancedb.com/blog/anythingllms-competitive-edge-lancedb-for-seamless-rag-and-agent-workflows/)
  - Aligns with CLI-friendly architecture

- **sqlite-vec as alternative:**

  - SQLite extension for vector search
  - [Successor to sqlite-vss with better platform support](https://github.com/asg017/sqlite-vec)
  - Aligns with existing SQLite architecture (`~/.shep/data`)
  - Node.js bindings with TypeScript support
  - Can combine vectors with existing relational data

- **Why not ChromaDB:**
  - Requires separate server process (Python-based)
  - [TypeScript client connects to server](https://www.npmjs.com/package/chromadb), not embedded
  - Adds Python dependency for server
  - More complex deployment

**Infrastructure impact:** LanceDB stores vector data in `~/.shep/memory/vectors/` directory. sqlite-vec alternative would extend existing SQLite database.

### 3. Graph Database (Local/File-based)

**User requirement:** Graph memory for relationships between memories, file-based storage.

**Options considered:**

1. **[Quadstore](https://github.com/quadstorejs/quadstore)** - LevelDB-backed RDF triplestore for TypeScript ([MIT](https://github.com/quadstorejs/quadstore))
2. **Neo4j** - ❌ Requires server, commercial license for enterprise features
3. **Custom SQLite graph layer** - ❌ Manual implementation (user rejected)

**Decision:** **Quadstore** (embedded RDF triplestore)

**Rationale:**

- **Quadstore advantages:**

  - TypeScript-native RDF graph database for Node.js, browsers, Deno, Bun
  - Implements RDF/JS interfaces with SPARQL query support
  - [LevelDB-backed with file-based persistence](https://github.com/quadstorejs/quadstore)
  - Works with any AbstractLevel storage backend
  - Supports named graphs (perfect for global vs feature-specific scoping)
  - Browser-compatible via IndexedDB backend
  - Active maintenance
  - Clean SPARQL interface (no manual graph implementation)

- **Why not Neo4j:**

  - Requires separate server process
  - Commercial licensing complexity
  - Overkill for CLI use case

- **Why not custom SQLite layer:**
  - User explicitly rejected manual graph/RAG implementation
  - Quadstore provides production-ready SPARQL queries

**Infrastructure impact:** Quadstore stores graph data in `~/.shep/memory/graphs/` directory using LevelDB.

### 4. Memory Framework & RAG Orchestration

**User requirement:** Don't want to implement graph and RAG manually, need integrated solution.

**Options considered:**

1. **[LangChain.js](https://js.langchain.com/)** - Memory modules, RAG orchestration, local embedding support ([MIT](https://github.com/langchain-ai/langgraphjs))
2. **LangGraph** - Agent orchestration with long-term memory ([MIT](https://github.com/langchain-ai/langgraphjs))
3. **Custom implementation** - ❌ Manual graph/RAG (user rejected)

**Decision:** **LangChain.js + LangGraph** for RAG orchestration and memory management

**Rationale:**

- **LangChain.js advantages:**

  - [Production-ready memory modules](https://js.langchain.com/docs/integrations/vectorstores/memory/)
  - [Supports local embeddings via Ollama](https://js.langchain.com/docs/integrations/text_embedding/ollama/) or Transformers.js
  - In-memory vector store for caching
  - RAG pipelines with document loaders, retrievers, and chains
  - TypeScript-native with strong typing
  - Large community and active development

- **LangGraph advantages:**

  - [Stateful agents with short-term and long-term memory](https://docs.langchain.com/oss/javascript/langgraph/overview)
  - Built-in memory stores for conversation histories
  - [Long-term persistent memory across sessions](https://langchain-ai.github.io/langmem/)
  - Planned dependency for Shep AI agent system

- **Integration strategy:**
  - LangChain.js for RAG (retrieval, embeddings, chains)
  - LangGraph for agent state and conversation memory
  - Quadstore for graph storage (relationships between memories)
  - LanceDB for vector storage (semantic search)
  - Transformers.js for embeddings (no API keys)

**Infrastructure impact:** LangChain.js + LangGraph as orchestration layer, zero external services required.

### 5. Memory Scope Implementation

**User requirement:** Hybrid (global + feature-specific memory)

**Decision:** Multi-graph architecture using Quadstore's named graphs

**Implementation:**

- **Global graph** (`shep:global`): User preferences, cross-feature patterns, general learnings
- **Per-feature graphs** (`shep:feature:{id}`): Feature-specific context, task details, isolated conversations
- **Bridge mechanism**: RDF triples can reference other graphs via URIs

**Rationale:**

- Quadstore natively supports [named graphs in SPARQL](https://github.com/quadstorejs/quadstore)
- Clean separation prevents context pollution
- Flexible queries across global, feature-specific, or both scopes
- Aligns with Clean Architecture (memory service handles routing)

### 6. Deployment Model

**Options considered:**

1. **Embedded TypeScript libraries** - Pure Node.js, no external services
2. **Optional local servers** - Add Ollama for power users
3. **Cloud services** - ❌ Requires API keys (user rejected)

**Decision:** Embedded TypeScript libraries with optional Ollama enhancement

**Rationale:**

- **Zero dependencies by default** - Works out of the box with Transformers.js + LanceDB + Quadstore
- **File-based storage** - Aligns with existing `~/.shep/` architecture
- **No Docker required** - Reduces barrier to entry
- **Progressive enhancement** - Power users can enable Ollama via config for larger models
- **Pure TypeScript stack** - No Python interop complexity
- Matches Shep's philosophy: simple by default, powerful when configured

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Shep AI Memory Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          LangChain.js + LangGraph (Orchestration)    │   │
│  │   - RAG pipelines                                     │   │
│  │   - Memory management                                 │   │
│  │   - Agent state                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ▲                                   │
│                          │                                   │
│         ┌────────────────┼────────────────┐                │
│         │                │                │                │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐       │
│  │ Transformers.js│  │  Quadstore   │  │  LanceDB     │       │
│  │  (Embeddings) │  │   (Graph)    │  │  (Vectors)   │       │
│  │               │  │              │  │              │       │
│  │ - Local ONNX  │  │ - RDF triples│  │ - Embedded   │       │
│  │ - No API keys │  │ - SPARQL     │  │ - File-based │       │
│  │ - In-process  │  │ - Named graph│  │ - Fast search│       │
│  └───────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       Optional: Ollama (Power Users)                 │   │
│  │   - Larger embedding models                          │   │
│  │   - Local LLM server (127.0.0.1:11434)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Storage Layout:
~/.shep/memory/
├── graphs/           # Quadstore LevelDB data
│   ├── global/       # Global memory graph
│   └── features/     # Per-feature graphs
├── vectors/          # LanceDB vector data
│   ├── global/       # Global embeddings
│   └── features/     # Per-feature embeddings
└── models/           # Transformers.js ONNX models
    └── embeddings/   # Cached embedding models
```

## Library Analysis

| Library                                                                      | Version | License                                                 | Purpose                           | Pros                                                                | Cons                                |
| ---------------------------------------------------------------------------- | ------- | ------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------- | ----------------------------------- |
| [`@xenova/transformers`](https://www.npmjs.com/package/@xenova/transformers) | ≥3.0.0  | [Apache 2.0](https://github.com/xenova/transformers.js) | Local embeddings (ONNX)           | 100% local, no API keys, TypeScript-native, in-process, active dev  | Slower than cloud APIs              |
| [`lancedb`](https://lancedb.com/)                                            | Latest  | [Apache 2.0](https://github.com/lancedb/lancedb)        | Embedded vector database          | TypeScript-native, file-based, fast search, zero-copy               | Young project                       |
| [`quadstore`](https://github.com/quadstorejs/quadstore)                      | Latest  | [MIT](https://github.com/quadstorejs/quadstore)         | RDF graph database (LevelDB)      | TypeScript-native, SPARQL, named graphs, file-based                 | Less known than Neo4j               |
| [`langchain`](https://js.langchain.com/)                                     | Current | [MIT](https://github.com/langchain-ai/langgraphjs)      | RAG orchestration, memory         | Production-ready, TypeScript-native, large community, local support | N/A                                 |
| [`@langchain/langgraph`](https://www.npmjs.com/package/@langchain/langgraph) | Current | [MIT](https://github.com/langchain-ai/langgraphjs)      | Agent orchestration               | Stateful agents, long-term memory, planned dependency               | N/A (existing planned dep)          |
| [`ollama`](https://ollama.com/) (optional)                                   | Latest  | [MIT](https://github.com/ollama/ollama)                 | Local LLM server with embeddings  | Larger models, TypeScript integration, local API                    | Requires separate server (optional) |
| [`sqlite-vec`](https://github.com/asg017/sqlite-vec) (alternative)           | Latest  | [Apache 2.0](https://github.com/asg017/sqlite-vec)      | SQLite vector extension           | Aligns with existing SQLite, Node.js bindings                       | Alternative to LanceDB              |
| TypeSpec models (to be added)                                                | N/A     | Project license                                         | Domain models for memory entities | Type-safe Episode/Node/Edge models                                  | Requires TypeSpec definitions       |

## Security Considerations

- **File permissions**: Memory files (`~/.shep/memory/`) must be user-only (0700 permissions like settings)
- **No API key storage**: Zero API keys stored anywhere (fully local architecture)
- **Memory data privacy**: Conversation history contains potentially sensitive information - implement data retention policies
- **Multi-tenant isolation**: If supporting multiple users, ensure graph access control prevents cross-user data leakage
- **Secret sanitization**: Before storing memories, sanitize any secrets/credentials from conversation text
- **Dependency audit**: Regular npm audit for Transformers.js, LanceDB, Quadstore, and transitive dependencies
- **Model validation**: Validate ONNX models downloaded from HuggingFace to prevent model poisoning
- **Local-only enforcement**: Configuration option to strictly disable any network calls during embedding/retrieval

## Performance Implications

### Latency Targets

- **Embedding generation**: 100-500ms for Transformers.js (in-process ONNX), faster with Ollama server
- **Vector retrieval**: <50ms for LanceDB (embedded, in-process)
- **Graph query**: <100ms for SPARQL queries on Quadstore (LevelDB backend)
- **End-to-end retrieval**: Target <300ms for hybrid retrieval (semantic + graph traversal)

### Resource Usage

- **Transformers.js models**: ~50-200MB disk space for embedding models (cached locally)
- **LanceDB storage**: Vector data grows with agent interactions (~1-10MB for moderate usage)
- **Quadstore storage**: Graph triples grow with relationships (~1-5MB for moderate usage)
- **Memory baseline**: In-process execution (~100-200MB RAM for typical usage)
- **Index maintenance**: Automatic in LanceDB, minimal overhead

### Optimizations

- **Lazy loading**: Only initialize embeddings/databases when memory features are used
- **Batch ingestion**: Buffer multiple memory writes for batch processing
- **Cache recent queries**: In-memory cache for frequently accessed memories (e.g., current feature context)
- **Memory pruning**: Implement retention policies to prune old/irrelevant memories
- **Model quantization**: Use quantized ONNX models for faster inference (INT8 vs FP32)
- **Optional Ollama**: Offload embeddings to Ollama server for power users who want faster/larger models

## Answered Questions from Spec

✅ **Does the memory system require a separate database or can it use file-based storage?**

- **Answer**: All components are file-based - LanceDB (vector directory), Quadstore (LevelDB), Transformers.js (cached models)
- **Decision**: Use embedded file-based storage for all components by default
- **Rationale**: Zero external dependencies, CLI-friendly, aligns with existing SQLite architecture

✅ **How does the memory system handle retrieval (semantic search, graph traversal)?**

- **Answer**: Hybrid retrieval combining semantic search (LanceDB vectors), graph traversal (Quadstore SPARQL), and keyword search (LangChain)
- **Decision**: Use LangChain.js to orchestrate hybrid retrieval across both datastores
- **Rationale**: No manual implementation required, production-ready RAG pipelines

✅ **What are the performance implications for large memory graphs?**

- **Answer**: Target <300ms end-to-end retrieval, LanceDB handles billions of vectors, Quadstore scales via LevelDB
- **Decision**: Target <300ms retrieval (real-time), implement pruning for long-term scalability
- **Rationale**: Sufficient for CLI use case, scales to thousands of memories without degradation

✅ **Should memory be scoped per-feature or globally across all agent interactions?**

- **Answer**: User requirement confirmed - hybrid approach (global + feature-specific)
- **Decision**: Multi-graph architecture using Quadstore's named graphs (`shep:global`, `shep:feature:{id}`)
- **Rationale**: Clean separation prevents context pollution, flexible queries across scopes

✅ **What configuration options does the memory system expose?**

- **Answer**: Embedding model selection (Transformers.js vs Ollama), storage paths, retention policies, pruning strategies
- **Decision**: Use Transformers.js + LanceDB + Quadstore by default, expose Ollama as optional enhancement
- **Rationale**: Simple defaults (zero dependencies), progressive enhancement for power users

✅ **Are API keys required for embeddings?**

- **Answer**: NO - Transformers.js runs 100% locally via ONNX Runtime, zero API keys required
- **Decision**: Use Transformers.js for default embeddings, Ollama as optional alternative
- **Rationale**: User explicitly rejected API keys, requires fully self-hosted solution

## Open Questions

All questions resolved during research phase.

---

**Sources:**

Transformers.js & Local Embeddings:

- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/index)
- [@xenova/transformers npm package](https://www.npmjs.com/package/@xenova/transformers)
- [Transformers.js v3: WebGPU Support](https://huggingface.co/blog/transformersjs-v3)
- [Running AI models in the browser with Transformers.js](https://blog.worldline.tech/2026/01/13/transformersjs-intro.html)

LanceDB & Vector Storage:

- [LanceDB GitHub](https://github.com/lancedb/lancedb)
- [LanceDB Official Site](https://lancedb.com/)
- [LanceDB for local AI development](https://lancedb.com/blog/the-future-of-ai-native-development-is-local-inside-continues-lancedb-powered-evolution/)

Quadstore & Graph Storage:

- [Quadstore GitHub](https://github.com/quadstorejs/quadstore)

LangChain.js & Memory:

- [LangChain.js Memory Documentation](https://docs.langchain.com/oss/javascript/langgraph/memory)
- [LangGraph Overview](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangMem - Long-term Memory](https://langchain-ai.github.io/langmem/)
- [Ollama Embeddings Integration](https://js.langchain.com/docs/integrations/text_embedding/ollama/)

ChromaDB:

- [ChromaDB Getting Started](https://docs.trychroma.com/)
- [chromadb npm package](https://www.npmjs.com/package/chromadb)

Ollama:

- [Ollama Embedding Models](https://ollama.com/blog/embedding-models)
- [Ollama Embeddings Documentation](https://docs.ollama.com/capabilities/embeddings)
- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)

SQLite Vector Extensions:

- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec)
- [sqlite-vss (deprecated)](https://github.com/asg017/sqlite-vss)

---

_Updated by `/shep-kit:research` — proceed with `/shep-kit:plan`_
