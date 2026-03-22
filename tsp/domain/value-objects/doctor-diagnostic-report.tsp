@doc("Summary of a failed agent run for diagnostic reporting")
model FailedRunSummary {
  @doc("Type of agent that failed (e.g. claude-code, gemini-cli)")
  agentType: string;

  @doc("Name/identifier of the agent run")
  agentName: string;

  @doc("Error message from the failed run")
  error: string;

  @doc("ISO 8601 timestamp when the failure occurred")
  timestamp: string;
}

@doc("System environment information for diagnostic reporting")
model SystemInfo {
  @doc("Node.js version (e.g. v20.11.0)")
  nodeVersion: string;

  @doc("Operating system platform (e.g. darwin, linux, win32)")
  platform: string;

  @doc("CPU architecture (e.g. x64, arm64)")
  arch: string;

  @doc("gh CLI version string")
  ghVersion: string;
}

@doc("Detailed agent run information including prompt and result for diagnostic reporting")
model AgentRunDetail {
  @doc("Type of agent (e.g. claude-code, gemini-cli)")
  agentType: string;

  @doc("Name/identifier of the agent run")
  agentName: string;

  @doc("Input prompt sent to the agent executor")
  prompt: string;

  @doc("Final result output from the agent (if available)")
  result?: string;

  @doc("Error message if the run failed")
  error?: string;

  @doc("ISO 8601 timestamp of the run")
  timestamp: string;
}

@doc("Worker log entry for a specific agent run")
model WorkerLogEntry {
  @doc("Agent run ID this log belongs to")
  agentRunId: string;

  @doc("Name of the agent that produced this log")
  agentName: string;

  @doc("Full log file content (may be truncated)")
  content: string;

  @doc("Whether the content was truncated due to size limits")
  truncated: boolean;

  @doc("Original character count before truncation (only set when truncated)")
  originalLength?: int32;
}

@doc("Structured diagnostic report collected by shep doctor for issue creation")
model DoctorDiagnosticReport {
  @doc("User-provided description of the problem")
  userDescription: string;

  @doc("Summaries of recent failed agent runs")
  failedRunSummaries: FailedRunSummary[];

  @doc("System environment information")
  systemInfo: SystemInfo;

  @doc("Current shep CLI version")
  cliVersion: string;

  @doc("Feature ID when diagnosing a specific feature (optional)")
  featureId?: string;

  @doc("Feature name when diagnosing a specific feature (optional)")
  featureName?: string;

  @doc("Feature lifecycle phase (e.g. Implementation, Review)")
  featureLifecycle?: string;

  @doc("Feature git branch name")
  featureBranch?: string;

  @doc("Feature description")
  featureDescription?: string;

  @doc("JSON-serialized feature workflow configuration (fast, push, openPr, approvalGates)")
  featureWorkflowConfig?: string;

  @doc("Raw spec.yaml content")
  specYaml?: string;

  @doc("Raw research.yaml content")
  researchYaml?: string;

  @doc("Raw plan.yaml content")
  planYaml?: string;

  @doc("Raw tasks.yaml content")
  tasksYaml?: string;

  @doc("Raw feature.yaml (status tracking) content")
  featureStatusYaml?: string;

  @doc("Detailed agent run information including prompts and results")
  agentRunDetails?: AgentRunDetail[];

  @doc("JSON-serialized conversation messages (Feature.messages[])")
  conversationMessages?: string;

  @doc("JSON-serialized feature plan (Feature.plan)")
  featurePlan?: string;

  @doc("Worker execution logs for agent runs associated with this feature")
  workerLogs?: WorkerLogEntry[];

  @doc("JSON-serialized phase timing records")
  phaseTimings?: string;
}
