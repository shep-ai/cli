# Lessons Learned

## Per-Feature Settings Must Flow Through All Layers

When the create drawer sends per-feature settings (e.g. `forkAndPr`, `commitSpecs`, `ciWatchEnabled`), they must be wired through EVERY layer:

1. **Server action interface** — add field to `CreateFeatureInput`
2. **Server action destructuring** — extract and pass to use case
3. **Use case input types** — `types.ts` interface
4. **Use case `createRecord()`** — set on the Feature entity
5. **Use case `initializeAndSpawn()`** — pass to agent spawn options
6. **Agent process interface** — spawn options type
7. **Agent process service** — build CLI args from options
8. **Agent worker args** — parse CLI args
9. **Agent state channels** — LangGraph annotations
10. **Graph invoke** — pass to graph input
11. **Node data builder** — read from feature entity for UI display
12. **Overview tab** — render in settings section

If any layer is skipped, the value silently falls back to a default and the user sees wrong settings in the overview.

**Pattern to check:** When adding a per-feature boolean, grep for an existing one (e.g. `forkAndPr`) across the entire codebase to find every touchpoint.
