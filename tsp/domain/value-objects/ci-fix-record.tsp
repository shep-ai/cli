@doc("Record of one CI fix attempt in the watch/fix loop")
model CiFixRecord {
  @doc("1-based attempt number")
  attempt: int32;

  @doc("ISO timestamp when this attempt started")
  startedAt: string;

  @doc("First 500 chars of failure logs for this attempt")
  failureSummary: string;

  @doc("Outcome of this attempt: fixed, failed, or timeout")
  outcome: string;
}
