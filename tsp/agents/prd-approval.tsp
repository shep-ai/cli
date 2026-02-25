/**
 * @module Shep.Agents.PrdApproval
 *
 * DTOs for PRD approval/rejection workflow.
 * Used for human-in-the-loop review of requirements phase output.
 */
import "../domain/value-objects/spec-metadata.tsp";

@doc("Change to a question's selected option during PRD review")
model QuestionSelectionChange {
  @doc("ID of the open question being changed (the question text)")
  questionId: string;

  @doc("The option text that the user selected")
  selectedOption: string;
}

@doc("Payload sent when user approves a PRD with optional selection changes")
model PrdApprovalPayload {
  @doc("Always true for approval payloads")
  approved: boolean;

  @doc("List of selection changes the user made during review (empty if no changes)")
  changedSelections?: QuestionSelectionChange[];
}

@doc("Payload sent when user rejects a PRD with feedback for iteration")
model PrdRejectionPayload {
  @doc("Always true for rejection payloads")
  rejected: boolean;

  @doc("User's feedback explaining what needs to change")
  feedback: string;

  @doc("Iteration number (1-based, derived from PhaseTiming row count)")
  iteration: int32;
}

@doc("A single question with its options as presented in the review TUI")
model ReviewQuestion {
  @doc("The question text")
  question: string;

  @doc("Available options with selection state")
  options: QuestionOption[];

  @doc("The option text that was selected by the user")
  selectedOption: string;

  @doc("Whether the user changed the selection from the AI default")
  changed: boolean;
}

@doc("Result of the PRD review TUI interaction")
model PrdReviewResult {
  @doc("All questions with their final selection state")
  questions: ReviewQuestion[];

  @doc("User action: approve or reject")
  action: string;

  @doc("Rejection feedback (only present when action is 'reject')")
  feedback?: string;
}
