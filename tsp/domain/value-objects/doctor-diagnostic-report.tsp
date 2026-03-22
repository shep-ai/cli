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
}
