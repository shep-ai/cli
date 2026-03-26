# Code Quality Rules (STRICT)

## Use Cases as the Only Entry Point

- Presentation layers (CLI, TUI, Web) MUST call core logic through use-case classes
- NEVER call infrastructure services or repositories directly from presentation code
- Use cases are the API boundary — they orchestrate domain logic and return results
- If a use case doesn't exist for what you need, create one — don't bypass the pattern

## Logic Lives in Core, Not Presentation

- Presentation layers are THIN — they handle UI/UX concerns ONLY (rendering, input, routing, formatting)
- ALL business logic, data transformation, orchestration, and decision-making belongs in core (use cases / domain services)
- If you find yourself writing `if/else` logic in a CLI command, web action, or React component that isn't about UI state — STOP. That logic belongs in a use case.
- Core must expose CONVENIENT, high-level APIs so presentation layers don't need to assemble low-level pieces
- When a presentation layer needs data, the use case should return it ready-to-use — not raw entities that need post-processing
- Test: if you deleted the entire CLI and rebuilt it, would you lose any business logic? If yes, that logic is in the wrong place.

## Presentation-Agnostic Core API

- Every feature MUST be implementable in ALL presentation layers (CLI, TUI, Web) using the SAME use-case API
- Use cases must NOT assume a specific presentation context (no HTTP concepts, no terminal concepts, no React concepts)
- If a use case only works for one presentation layer, it's designed wrong — redesign the API
- When adding a new capability: first design the use case, then implement in the presentation layer that needs it, but verify the API would work for the others too
- Presentation-specific adapters (e.g., SSE for web, streaming for CLI) wrap the same core output — they don't get their own parallel implementation

## Agent-Agnostic Design

- No component may hardcode a specific AI provider (Claude, OpenAI, etc.)
- All agent interactions go through generic interfaces (`IAgentExecutorProvider`)
- Provider-specific logic lives ONLY inside infrastructure adapter implementations
- If you're importing a provider SDK outside of `infrastructure/`, you're doing it wrong

## File Length & Focus

- Keep files focused on a single responsibility
- If a file exceeds ~300 lines, it likely does too much — refactor before adding more
- When a change requires touching a long file, refactor it first, then make your change
- Prefer many small, focused files over few large ones
- Split by concern: types, logic, helpers, constants — not by arbitrary line limits

## No Duplication

- Before writing new code, search for existing implementations of the same logic
- If you see duplicated logic, refactor it into a shared function/module before proceeding
- Two instances is a coincidence — three is a pattern that MUST be extracted
- Shared logic goes in the appropriate layer: domain utils, application helpers, or infrastructure shared

## No Magic Values

- No inline string literals used for comparison, branching, or configuration
- No magic numbers — define named constants with clear intent
- Use enums for fixed sets of values (prefer TypeSpec-defined enums for domain concepts)
- Any string used in `=== "value"` that represents a domain concept (status, phase, type, mode) MUST be a TypeSpec-defined enum — never a raw string
- Constants live near their usage or in a dedicated constants file if shared
- Exception: obvious literals like `0`, `1`, `true`, `false`, `''`, `null` in clear context

## No Singletons or Global State Outside Infrastructure Bootstrapping

- Singletons, module-level caches, and global accessor functions are BANNED outside of infrastructure bootstrapping code
- Application and presentation layers access all services through dependency injection — never by importing a global function or module-scoped instance
- If a convenient global accessor exists (e.g., `getSettings()`, `getShepHomeDir()`), it must NOT be called from use cases, commands, or components — inject the dependency instead
- This ensures testability (mocking via DI, not module patching) and enforces the dependency rule

## No Direct Infrastructure Imports in Application or Presentation

- Application layer (use cases) must ONLY import from domain and its own port interfaces
- Presentation layer must ONLY import from use cases and domain types
- If you need infrastructure logic in a use case, define a port interface in `application/ports/` and inject it
- If you need infrastructure logic in presentation, wrap it in a use case
- Common violating patterns to watch for: importing utility functions, path helpers, platform checks, or service singletons from `infrastructure/` into outer layers

## Refactor Before Extending

- When you need to modify a file that already violates a rule (too long, has duplication, has magic values), fix the violation FIRST, then make your change
- Never add to existing tech debt — every touch is a cleanup opportunity
- If refactoring the violation is genuinely out of scope, flag it to the user before proceeding — don't silently ignore it

## Extract Shared Utilities Before Duplicating

- Before writing a utility function in a command or component, search the codebase for existing implementations
- If you find yourself writing a function that 2+ files already contain, extract it FIRST, update all call sites, then continue your work
- Shared utilities go in the appropriate layer — presentation utils for presentation concerns, domain/infrastructure shared for core concerns
