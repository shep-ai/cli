@doc("Record of one node-level auto-fix attempt")
model NodeFixRecord {
  @doc("1-based attempt number")
  attempt: int32;

  @doc("Name of the graph node that failed")
  nodeName: string;

  @doc("First 500 chars of error message for this attempt")
  errorSummary: string;

  @doc("ISO timestamp when this attempt started")
  startedAt: string;

  @doc("Outcome of this attempt: fixed, failed, unfixable, or non-fixable")
  outcome: string;
}
