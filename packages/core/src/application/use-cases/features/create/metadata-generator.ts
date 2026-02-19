/**
 * MetadataGenerator
 *
 * Generates feature metadata (slug, name, description) from user input
 * via AI call through IAgentExecutorProvider.
 * Errors are propagated to the caller.
 */

import { injectable, inject } from 'tsyringe';
import type { IAgentExecutorProvider } from '../../../ports/output/agents/agent-executor-provider.interface.js';
import type { FeatureMetadata } from './types.js';

/** Maximum characters of user input sent to the AI for metadata generation. */
const MAX_INPUT_FOR_AI = 500;

@injectable()
export class MetadataGenerator {
  constructor(
    @inject('IAgentExecutorProvider')
    private readonly executorProvider: IAgentExecutorProvider
  ) {}

  /**
   * Generate feature metadata from user input via AI.
   * Errors are propagated to the caller.
   */
  async generateMetadata(userInput: string): Promise<FeatureMetadata> {
    const executor = this.executorProvider.getExecutor();

    const truncated =
      userInput.length > MAX_INPUT_FOR_AI
        ? `${userInput.slice(0, MAX_INPUT_FOR_AI)}...`
        : userInput;

    const prompt = `Analyze this user request and extract the CORE feature intent. Condense to essential concepts.

User request:
"${truncated}"

IMPORTANT: Don't use the request as-is. Extract the key feature being requested and improve the wording.

Return ONLY a JSON object with these fields:
- slug: kebab-case identifier, 2-4 words MAX. Extract the core feature name (e.g., "github-oauth-login" from "add github oauth")
- name: polished, professional title (improve upon user's wording)
- description: refined 1-2 sentence description that captures the feature essence (not the request verbatim)

JSON only, no markdown fences.`;

    const result = await executor.execute(prompt, {
      maxTurns: 1,
      allowedTools: [],
      silent: true,
      outputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'kebab-case identifier, 2-4 words' },
          name: { type: 'string', description: 'polished, professional title' },
          description: { type: 'string', description: 'refined 1-2 sentence description' },
        },
        required: ['slug', 'name', 'description'],
        additionalProperties: false,
      },
    });

    const cleaned = this.extractJson(result.result);
    if (!cleaned) {
      throw new Error('AI returned empty response for metadata generation');
    }
    const parsed = JSON.parse(cleaned);
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
   * Extract JSON from an AI response that may include markdown fences or surrounding prose.
   * Finds the first `{` and its matching closing `}`, ignoring text outside.
   */
  private extractJson(text: string): string {
    const start = text.indexOf('{');
    if (start === -1) return text.trim();

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    // Fallback: return from first brace to end, trimmed
    return text.slice(start).trim();
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
