/**
 * MetadataGenerator
 *
 * Generates feature metadata (slug, name, description) from user input
 * via AI call through IStructuredAgentCaller.
 * When the user input references a file (e.g. SPEC.md), the file content
 * is read and included in the prompt so the AI derives metadata from the
 * actual file rather than the bare reference string.
 * Errors are propagated to the caller.
 */

import { injectable, inject } from 'tsyringe';
import { readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import type { AgentType } from '../../../../domain/generated/output.js';
import type { IStructuredAgentCaller } from '../../../ports/output/agents/structured-agent-caller.interface.js';

interface FeatureMetadata {
  slug: string;
  name: string;
  description: string;
}

/** Maximum characters of user input sent to the AI for metadata generation. */
const MAX_INPUT_FOR_AI = 500;

/** Maximum characters of file content included in the AI prompt. */
const MAX_FILE_CONTENT_FOR_AI = 4000;

/**
 * Pattern that matches user input referencing a file for feature definition.
 * Captures the filename in group 1. Case-insensitive.
 * Examples: "Develop based on the current SPEC.md", "based on SPEC.md", "use ./docs/SPEC.md"
 */
const FILE_REFERENCE_PATTERN =
  /(?:based\s+on|from|use|using|see|refer\s+to|according\s+to)[\s]+(?:the\s+)?(?:current\s+)?(\S+\.(?:md|txt|yaml|yml))/i;

const METADATA_SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string', description: 'kebab-case identifier, 2-4 words' },
    name: { type: 'string', description: 'polished, professional title' },
    description: { type: 'string', description: 'refined 1-2 sentence description' },
  },
  required: ['slug', 'name', 'description'],
  additionalProperties: false,
} as const;

@injectable()
export class MetadataGenerator {
  constructor(
    @inject('IStructuredAgentCaller')
    private readonly structuredCaller: IStructuredAgentCaller
  ) {}

  /**
   * Generate feature metadata from user input via AI.
   * When repositoryPath is provided, file references in the user input
   * (e.g. "Develop based on the current SPEC.md") are resolved and their
   * content is included in the prompt.
   * Errors are propagated to the caller.
   */
  async generateMetadata(
    userInput: string,
    agentType?: AgentType,
    repositoryPath?: string
  ): Promise<FeatureMetadata> {
    const fileContent = repositoryPath
      ? this.resolveFileReference(userInput, repositoryPath)
      : undefined;

    const effectiveInput = fileContent
      ? `${userInput}\n\n--- Referenced file content ---\n${fileContent}`
      : userInput;

    const truncated =
      effectiveInput.length > MAX_INPUT_FOR_AI + MAX_FILE_CONTENT_FOR_AI
        ? `${effectiveInput.slice(0, MAX_INPUT_FOR_AI + MAX_FILE_CONTENT_FOR_AI)}...`
        : effectiveInput;

    const fileHint = fileContent
      ? "\nIMPORTANT: The user referenced a file. Derive the feature name, slug, and description from the FILE CONTENT, not from the user's reference instruction."
      : '';

    const prompt = `Analyze this user request and extract the CORE feature intent. Condense to essential concepts.

User request:
"${truncated}"

IMPORTANT: Don't use the request as-is. Extract the key feature being requested and improve the wording.${fileHint}

Return a JSON object with these fields:
- slug: kebab-case identifier, 2-4 words MAX. Extract the core feature name (e.g., "github-oauth-login" from "add github oauth")
- name: polished, professional title (improve upon user's wording)
- description: refined 1-2 sentence description that captures the feature essence (not the request verbatim)`;

    try {
      const parsed = await this.structuredCaller.call<FeatureMetadata>(prompt, METADATA_SCHEMA, {
        maxTurns: 10,
        allowedTools: [],
        silent: true,
        agentType,
      });

      if (parsed.slug && parsed.name && parsed.description) {
        return {
          slug: this.toSlug(parsed.slug),
          name: parsed.name,
          description: parsed.description,
        };
      }
    } catch {
      // AI-based metadata generation failed — fall through to local extraction
    }

    return this.extractMetadataLocally(userInput);
  }

  /**
   * Detect a file reference in user input and read the file content.
   * Returns the file content if found and readable, undefined otherwise.
   */
  resolveFileReference(userInput: string, repositoryPath: string): string | undefined {
    const match = FILE_REFERENCE_PATTERN.exec(userInput);
    if (!match) return undefined;

    const filename = match[1];
    const candidates = [
      // Try the path as-is (handles absolute or relative with ./)
      isAbsolute(filename) ? filename : join(repositoryPath, filename),
      // Also try common locations
      join(repositoryPath, filename.replace(/^\.\//, '')),
    ];

    for (const candidate of candidates) {
      try {
        if (existsSync(candidate)) {
          const content = readFileSync(candidate, 'utf-8');
          if (content.trim().length > 0) {
            return content.length > MAX_FILE_CONTENT_FOR_AI
              ? `${content.slice(0, MAX_FILE_CONTENT_FOR_AI)}...`
              : content;
          }
        }
      } catch {
        // File not readable — try next candidate
      }
    }

    return undefined;
  }

  /**
   * Extract metadata locally from user input without AI.
   * Used as fallback when the AI call fails or returns invalid data.
   */
  private extractMetadataLocally(userInput: string): FeatureMetadata {
    const slug = this.toSlug(userInput);
    // Capitalize first letter of each word for the name
    const name = userInput
      .slice(0, 80)
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
    return { slug, name, description: userInput.slice(0, 200).trim() };
  }

  /**
   * Convert text to kebab-case slug with 50-char limit.
   * Removes special characters, collapses spaces, limits length.
   */
  private toSlug(text: string): string {
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Limit to ~50 chars, cutting at a word boundary
    if (slug.length <= 50) {
      return slug;
    }
    const truncated = slug.slice(0, 50);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 10 ? truncated.slice(0, lastDash) : truncated;
  }
}
