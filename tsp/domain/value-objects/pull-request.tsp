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
}
