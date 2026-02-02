/**
 * Custom Scalar Types
 *
 * Defines custom scalar types used throughout the Shep AI domain models.
 * Scalars provide type-safe aliases for primitive types with semantic meaning.
 *
 * These scalar types serve as the foundational building blocks for all domain
 * entities, ensuring consistent type definitions across the entire codebase.
 *
 * ## Usage
 *
 * Import this module in any TypeSpec file that requires typed identifiers:
 *
 * ```typespec
 * import "./scalars.tsp";
 *
 * model MyEntity {
 *   id: UUID;
 * }
 * ```
 *
 * ## Design Rationale
 *
 * Using custom scalars instead of raw `string` types provides:
 * - **Type Safety**: Prevents accidental mixing of different identifier types
 * - **Self-Documentation**: Code clearly indicates the expected format
 * - **Validation Hooks**: Enables runtime validation in generated code
 * - **IDE Support**: Better autocomplete and error detection
 *
 * @module common/scalars
 * @see common/base.tsp - Uses UUID for entity identifiers
 * @see domain/core.tsp - All core entities use these scalars
 */
/**
 * A universally unique identifier (UUID v4) in string format.
 *
 * UUIDs are 128-bit identifiers that are guaranteed to be unique across
 * space and time. They follow the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is a hexadecimal digit and y is one of 8, 9, A, or B.
 *
 * @example
 * ```typespec
 * model Feature {
 *   @doc("Unique identifier for the feature")
 *   id: UUID;
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000"
 * }
 * ```
 */
@doc("A universally unique identifier (UUID v4) in string format")
scalar UUID extends string;
