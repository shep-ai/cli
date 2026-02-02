/**
 * @module Shep.Common.Enums.Artifact
 *
 * Defines enums for categorizing and formatting artifacts generated
 * by the Shep AI platform during the development lifecycle.
 */
/**
 * Categorizes artifacts by their purpose in the development process.
 * Each category represents a different type of documentation or specification.
 */
@doc("Categories for classifying artifact types by purpose")
enum ArtifactCategory {
  /**
   * Product Requirements Document - captures user requirements,
   * acceptance criteria, and feature specifications.
   */
  @doc("Product Requirements Document with user requirements and acceptance criteria")
  PRD,

  /**
   * API specification documents including endpoint definitions,
   * request/response schemas, and integration guides.
   */
  @doc("API specification and integration documentation")
  API,

  /**
   * Design documents including architecture diagrams,
   * data models, and technical design decisions.
   */
  @doc("Architecture and technical design documentation")
  Design,

  /**
   * Any artifact that does not fit into the predefined
   * categories above.
   */
  @doc("Artifacts that do not fit predefined categories")
  Other,
}

/**
 * Specifies the file format used to store artifact content.
 * Determines how the artifact should be parsed and rendered.
 */
@doc("File formats for artifact content storage")
enum ArtifactFormat {
  /**
   * Markdown format - rich text with headings, lists,
   * code blocks, and other formatting.
   */
  @doc("Markdown format for rich text content")
  Markdown: "md",

  /**
   * Plain text format - unformatted text content
   * without any special markup.
   */
  @doc("Plain text format without markup")
  Text: "txt",

  /**
   * YAML format - structured data format commonly
   * used for configuration and specifications.
   */
  @doc("YAML format for structured data")
  Yaml: "yaml",

  /**
   * Any format that does not fit into the predefined
   * formats above.
   */
  @doc("Formats that do not fit predefined types")
  Other,
}
