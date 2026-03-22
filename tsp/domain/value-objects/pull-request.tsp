import "../../common/enums/workflow.tsp";
import "./ci-fix-record.tsp";

@doc("Pull request tracking data for a feature")
model PullRequest {
  @doc("GitHub PR URL")
  url: string;

  @doc("GitHub PR number")
  number: int32;

  @doc("Current PR status")
  status: PrStatus;

  @doc("Final commit SHA after push")
  commitHash?: string;

  @doc("CI pipeline status")
  ciStatus?: CiStatus;

  @doc("Number of CI fix attempts made")
  ciFixAttempts?: int32;

  @doc("History of CI fix attempts")
  ciFixHistory?: CiFixRecord[];

  @doc("Whether the PR can be merged (false = merge conflicts)")
  mergeable?: boolean;

  /** URL of the PR created on the upstream repo (fork-and-PR flow only) */
  upstreamPrUrl?: string;

  /** PR number on the upstream repo */
  upstreamPrNumber?: int32;

  /** Status of the upstream PR (Open, Merged, Closed) */
  upstreamPrStatus?: PrStatus;
}
