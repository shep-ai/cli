/**
 * MemoryScope - Defines isolation level for memories
 *
 * Global: Shared across all features (user preferences, cross-feature patterns)
 * Feature: Isolated to a specific feature (task context, feature-specific decisions)
 */
@doc("Memory scope enum - defines isolation level")
enum MemoryScope {
  /**
   * Global memory - shared across all features
   */
  @doc("Global scope - shared across features")
  Global: "global",

  /**
   * Feature-specific memory - isolated to one feature
   */
  @doc("Feature scope - isolated to specific feature")
  Feature: "feature",
}
