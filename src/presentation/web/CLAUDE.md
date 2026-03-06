# Web UI Development Notes

## Running the UI

There are two distinct ways to run the web UI. **Always test in BOTH modes.**

### 1. Dev Mode (local development)

```bash
pnpm dev:web
```

- Uses `dev-server.ts` which initializes the DI container and starts Next.js in dev mode
- Turbopack HMR enabled
- Runs on port 3000 by default

### 2. Production Mode (how users run it)

```bash
shep ui
# or
pnpm dev:cli ui
```

- The CLI bootstraps the DI container (`src/presentation/cli/index.ts`), then starts Next.js via `WebServerService`
- Runs on port 4050 by default
- This is how real users experience the UI
- **IMPORTANT**: Always test real-time features in this mode, not just dev mode

### Key Differences Between Modes

| Aspect             | Dev Mode (`pnpm dev:web`)                               | Production Mode (`shep ui`)                             |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------- |
| Entry point        | `dev-server.ts`                                         | `cli/index.ts` -> `ui.command.ts` -> `WebServerService` |
| Port               | 3000                                                    | 4050                                                    |
| DI container       | Set on `globalThis.__shepContainer` in dev-server.ts:73 | Set in cli/index.ts:76                                  |
| WebSocket upgrades | Forwarded (HMR works)                                   | NOT forwarded in `WebServerService`                     |
| Next.js mode       | Always dev                                              | dev when run from source, prod when installed           |

## SSE / Real-Time Update Architecture

```
DB polling (500ms) -> /api/agent-events (SSE route)
    -> Service Worker (public/agent-events-sw.js, single connection)
        -> postMessage to all browser tabs
            -> useAgentEvents hook (hooks/use-agent-events.ts)
                -> AgentEventsProvider context (hooks/agent-events-provider.tsx)
                    -> useControlCenterState (optimistic node updates via setNodes)
                        -> React state updates -> sidebar + React Flow canvas
```

### SSE Key Files

| File                                                             | Purpose                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `app/api/agent-events/route.ts`                                  | SSE endpoint, polls DB every 500ms, emits delta events |
| `app/api/agent-events/health/route.ts`                           | Health check: `/api/agent-events/health`               |
| `public/agent-events-sw.js`                                      | Service Worker: multiplexes single SSE to all tabs     |
| `hooks/use-agent-events.ts`                                      | Client hook: registers with SW, receives events        |
| `hooks/agent-events-provider.tsx`                                | React context wrapping `useAgentEvents`                |
| `components/features/control-center/use-control-center-state.ts` | Processes SSE events into React Flow node updates      |
| `components/common/feature-node/derive-feature-state.ts`         | Maps event types/phases to UI state/lifecycle          |

### SSE Event Flow Details

1. **SSE route** seeds a per-connection cache on first poll (no events emitted for initial state)
2. Subsequent polls compare DB state against cache, emit only deltas
3. **Service Worker** connects to `/api/agent-events` via EventSource on first subscriber
4. SW broadcasts `{ type: 'notification', data }` to all tabs via `clients.matchAll()`
5. **useControlCenterState** effect processes new events, calls `setNodes()` to update node state/lifecycle
6. **Polling fallback** (5s interval) fetches via `fetchGraphData()` server action for active features

### SSE Lifecycle Mappings

The SSE route maps `SdlcLifecycle` enum -> agent graph node names -> client `FeatureLifecyclePhase`:

```
SdlcLifecycle.Started     -> 'requirements'  -> 'requirements'
SdlcLifecycle.Analyze     -> 'analyze'       -> 'requirements'
SdlcLifecycle.Requirements-> 'requirements'  -> 'requirements'
SdlcLifecycle.Research    -> 'research'      -> 'research'
SdlcLifecycle.Planning    -> 'plan'          -> 'implementation'
SdlcLifecycle.Implementation -> 'implement'  -> 'implementation'
SdlcLifecycle.Review      -> 'merge'         -> 'review'
SdlcLifecycle.Maintain    -> 'maintain'      -> 'maintain'
SdlcLifecycle.Blocked     -> 'blocked'       -> 'requirements'
```

## React Flow Rendering (CRITICAL)

React Flow v12 (`@xyflow/react` ^12.10.0) has specific behaviors that affect real-time updates:

- **Controlled mode**: `<ReactFlow nodes={nodes}>` passes nodes as props
- **Internal Zustand store**: React Flow syncs props to an internal `nodeLookup` Map via `StoreUpdater`
- **Memoized NodeWrapper**: Each node is wrapped in `memo(NodeWrapper)` which subscribes to store via `useStore(selector, shallow)`
- **NodeWrapper gets node from store**, NOT from props directly. It does `s.nodeLookup.get(id)` with `shallow` comparison
- **Single ReactFlowProvider**: There must be exactly ONE `ReactFlowProvider` ancestor. Multiple nested providers create separate stores, causing the outer one's `StoreUpdater` to sync nodes to a store that the inner components don't read from

### Circular Update Loop (FIXED — do not reintroduce)

In controlled mode, `enrichedNodes` (useMemo in FeaturesCanvas) creates new node objects every render
(adding callbacks to `data`). StoreUpdater sees different references and emits `replace` changes via
`onNodesChange`. If `onNodesChange` applies these 'replace' changes back to state via `applyNodeChanges`,
it overwrites SSE-driven state updates with stale data from the previous render, AND triggers another
`enrichedNodes` recalculation → infinite loop (110+ renders on page load).

**Fix**: `onNodesChange` in `use-control-center-state.ts` filters out `replace` changes. Only `dimensions`,
`position`, `select`, etc. are applied. StoreUpdater still syncs props to its internal store regardless —
our state remains the source of truth.

**NEVER** remove the `c.type !== 'replace'` filter from `onNodesChange`.

## Testing Real-Time Updates

1. Start the UI in the mode you want to test
2. Check SSE health: `curl http://localhost:<port>/api/agent-events/health`
3. Check SW status in browser: `navigator.serviceWorker.controller?.state` should be "activated"
4. Trigger state changes: `pnpm dev:cli feat approve <id>` or start a new feature run
5. Watch both **sidebar** and **canvas nodes** - they should both update
6. Check browser console for errors
7. Check server logs for `[SSE] emit:` messages confirming events are sent

## Common Pitfalls

- **No events when nothing changes**: SSE only emits deltas. If no feature state changes, no events are sent. This is correct behavior.
- **Polling fallback dependency**: The 5s polling `useEffect` depends on a derived `hasActiveFeature` boolean (not `nodes` directly). Using `[nodes]` as a dependency would reset the interval on every node change, potentially preventing it from ever firing.
- **Storybook mocks**: New server actions need mocks in `.storybook/mocks/app/actions/` or Storybook build breaks.
- **`output: 'standalone'`** in next.config.ts: Production builds use standalone mode. Route handlers are bundled differently.
