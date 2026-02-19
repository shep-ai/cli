/**
 * @module Shep.Common.Enums.Workflow
 *
 * Defines enums for the post-implementation workflow:
 * PR status tracking and CI status tracking.
 */
/**
 * Status of a pull request associated with a feature.
 */
@doc("Pull request status for a feature")
enum PrStatus {
  @doc("PR is open and awaiting review/merge")
  Open,

  @doc("PR has been merged into the target branch")
  Merged,

  @doc("PR has been closed without merging")
  Closed,
}

/**
 * Status of CI pipeline for a feature's branch or PR.
 */
@doc("CI pipeline status")
enum CiStatus {
  @doc("CI is running or waiting to start")
  Pending,

  @doc("CI has passed all checks")
  Success,

  @doc("CI has failed one or more checks")
  Failure,
}
