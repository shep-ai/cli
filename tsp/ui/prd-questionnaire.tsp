/**
 * @module Shep.UI.PrdQuestionnaire
 *
 * Defines value objects for the PRD questionnaire component used in the
 * requirements discovery phase. These models represent the structured
 * questions, options, and actions displayed in the PrdQuestionnaire UI.
 *
 * ## Design Notes
 *
 * These are value objects (not entities) - they do NOT extend BaseEntity.
 * They are presentation-layer types with no persistence identity, kept
 * separate from domain types per Clean Architecture boundaries.
 */
@doc("A selectable option within a PRD questionnaire question")
model PrdOption {
  @doc("Unique identifier for this option")
  id: string;

  @doc("Display label for this option")
  label: string;

  @doc("Explanation of why this option is relevant")
  rationale: string;

  @doc("Whether this option is recommended by AI analysis")
  recommended?: boolean;

  @doc("Whether this option was newly added after refinement")
  isNew?: boolean;
}

@doc("A single question in the PRD questionnaire with selectable options")
model PrdQuestion {
  @doc("Unique identifier for this question")
  id: string;

  @doc("The question text displayed to the user")
  question: string;

  @doc("Question interaction type (currently only single-select)")
  type: "select";

  @doc("Available options for this question")
  options: PrdOption[];
}

@doc("Configuration for the final action button in the questionnaire")
model PrdFinalAction {
  @doc("Unique identifier for this action")
  id: string;

  @doc("Button label text")
  label: string;

  @doc("Description of what this action does")
  description: string;
}

@doc("Complete data for rendering a PRD questionnaire")
model PrdQuestionnaireData {
  @doc("Header title text for the questionnaire")
  question: string;

  @doc("Header context/description text")
  context: string;

  @doc("Array of questions to display")
  questions: PrdQuestion[];

  @doc("Configuration for the finalize/approve action button")
  finalAction: PrdFinalAction;
}
