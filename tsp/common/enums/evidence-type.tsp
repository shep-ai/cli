/**
 * @module Shep.Common.Enums.EvidenceType
 *
 * Defines the type of evidence captured to prove task completion.
 * Used by the evidence node to categorize artifacts collected
 * during the evidence-collection phase of the feature-agent workflow.
 */
@doc("Type of evidence captured to prove task completion")
enum EvidenceType {
  @doc("Visual screenshot of UI or application output")
  Screenshot,

  @doc("Screen recording or video capture of workflow execution")
  Video,

  @doc("Test suite execution results and output logs")
  TestOutput,

  @doc("CLI command output or terminal session recording")
  TerminalRecording,
}
