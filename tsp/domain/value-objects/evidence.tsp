import "../../common/enums/evidence-type.tsp";

@doc("Record of evidence captured to prove task completion")
model Evidence {
  @doc("Category of evidence captured")
  type: EvidenceType;

  @doc("ISO 8601 timestamp when the evidence was captured")
  capturedAt: string;

  @doc("Human-readable description of what this evidence proves")
  description: string;

  @doc("Path relative to repo root for GitHub rendering")
  relativePath: string;

  @doc("Optional reference to the task this evidence proves")
  taskRef?: string;
}
