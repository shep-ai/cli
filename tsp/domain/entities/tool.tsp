/**
 * @module Shep.Domain.Entities.Tool
 *
 * Defines the Tool entity for IDE and CLI tool management in the Shep AI platform.
 * A Tool represents a code editor, IDE, or CLI agent that can be installed and
 * managed by Shep for development workflows.
 *
 * ## Entity Relationships
 *
 * ```
 * +-----------------------------------------------+
 * |              TOOL (Entity)                     |
 * +-----------------------------------------------+
 * | id: UUID                                       |
 * | toolName: string                               |
 * | type: ToolType                                 |
 * | installedVersion?: string                      |
 * | installedAt?: utcDateTime                      |
 * | createdAt: utcDateTime                         |
 * | updatedAt: utcDateTime                         |
 * +-----------------------------------------------+
 * ```
 *
 * ## Entity Characteristics
 *
 * - **Independent Identity**: Each Tool has a unique UUID
 * - **Lifecycle Management**: Tracks when installed and version information
 * - **Type System**: Strongly typed via ToolType enum
 * - **Persistence**: Automatically tracked with timestamps
 *
 * @see ../enums/tool.tsp - ToolType enum definition
 * @see ../../common/base.tsp - BaseEntity base class
 */
import "../../common/base.tsp";
import "../../common/enums/tool.tsp";

/**
 * Tool entity for IDE and CLI agent management.
 *
 * The Tool entity represents a code editor, IDE, or CLI agent that can be
 * installed and managed by Shep. Each tool is identified by type (ToolType enum),
 * tracks installation state, version information, and timestamp metadata.
 *
 * ## Properties
 *
 * | Property         | Type       | Required | Description                              |
 * |------------------|------------|----------|------------------------------------------|
 * | id               | UUID       | Yes      | Unique identifier (inherited from BaseEntity) |
 * | toolName         | string     | Yes      | Display name of the tool                 |
 * | type             | ToolType   | Yes      | Type of tool (IDE or CLI agent)          |
 * | installedVersion | string     | No       | Currently installed version number       |
 * | installedAt      | utcDateTime| No       | Timestamp of installation                |
 * | createdAt        | utcDateTime| Yes      | Entity creation timestamp (inherited)    |
 * | updatedAt        | utcDateTime| Yes      | Last update timestamp (inherited)        |
 *
 * ## State Transitions
 *
 * A Tool entity lifecycle:
 *
 * 1. **Created**: Tool record created in system
 * 2. **Not Installed**: toolName and type set, installedVersion and installedAt null
 * 3. **Installing**: Installation process initiated
 * 4. **Installed**: installedVersion and installedAt populated
 * 5. **Updated**: New version installed, timestamps updated
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "toolName": "Visual Studio Code",
 *   "type": "vscode",
 *   "installedVersion": "1.85.0",
 *   "installedAt": "2024-10-15T14:30:00Z",
 *   "createdAt": "2024-10-15T14:30:00Z",
 *   "updatedAt": "2024-10-15T14:30:00Z"
 * }
 * ```
 */
@doc("IDE or CLI tool entity with installation tracking")
model Tool extends BaseEntity {
  /**
   * Display name of the tool
   * @example "Visual Studio Code"
   */
  @doc("Display name of the tool")
  toolName: string;

  /**
   * Type of tool (IDE or CLI agent)
   * @example "vscode"
   */
  @doc("Tool type classification")
  type: ToolType;

  /**
   * Currently installed version number
   * @example "1.85.0"
   */
  @doc("Installed version number")
  installedVersion?: string;

  /**
   * Timestamp when the tool was installed
   * @example "2024-10-15T14:30:00Z"
   */
  @doc("Tool installation timestamp")
  installedAt?: utcDateTime;
}
