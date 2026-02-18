import "../../common/enums/workflow.tsp";

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
}
