/**
 * MetadataGenerator
 *
 * Generates feature metadata (slug, name, description) from user input
 * via AI call through IStructuredAgentCaller.
 * Errors are propagated to the caller.
 */

import { injectable, inject } from 'tsyringe';
import type { IStructuredAgentCaller } from '../../../ports/output/agents/structured-agent-caller.interface.js';

interface FeatureMetadata {
  slug: string;
  name: string;
  description: string;
}

/** Maximum characters of user input sent to the AI for metadata generation. */
const MAX_INPUT_FOR_AI = 500;

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
   * Errors are propagated to the caller.
   */
  async generateMetadata(userInput: string): Promise<FeatureMetadata> {
    const truncated =
      userInput.length > MAX_INPUT_FOR_AI
        ? `${userInput.slice(0, MAX_INPUT_FOR_AI)}...`
        : userInput;

    const prompt = `Analyze this user request and extract the CORE feature intent. Condense to essential concepts.

User request:
"${truncated}"

IMPORTANT: Don't use the request as-is. Extract the key feature being requested and improve the wording.

Return a JSON object with these fields:
- slug: kebab-case identifier, 2-4 words MAX. Extract the core feature name (e.g., "github-oauth-login" from "add github oauth")
- name: polished, professional title (improve upon user's wording)
- description: refined 1-2 sentence description that captures the feature essence (not the request verbatim)`;

    const parsed = await this.structuredCaller.call<FeatureMetadata>(prompt, METADATA_SCHEMA, {
      maxTurns: 10,
      allowedTools: [],
      silent: true,
    });

    if (!parsed.slug || !parsed.name || !parsed.description) {
      throw new Error('Missing required fields in AI response');
    }

    return {
      slug: this.toSlug(parsed.slug),
      name: parsed.name,
      description: parsed.description,
    };
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
