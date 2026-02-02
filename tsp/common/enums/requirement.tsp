/**
 * @module Shep.Common.Enums.Requirement
 *
 * Defines enums for requirement classification in the Shep AI platform.
 * Requirements are categorized to help prioritize and organize feature specifications.
 */
/**
 * Classifies requirements by their nature and impact on the system.
 * This distinction helps in planning and prioritization.
 */
@doc("Types of requirements based on their nature")
enum RequirementType {
  /**
   * Functional requirements describe what the system should do -
   * specific behaviors, features, and capabilities that users
   * can directly interact with or observe.
   */
  @doc("Requirements describing system behaviors and features")
  Functional,

  /**
   * Non-functional requirements describe how the system should perform -
   * quality attributes like performance, security, reliability,
   * scalability, and maintainability.
   */
  @doc("Requirements describing quality attributes and constraints")
  NonFunctional,
}
