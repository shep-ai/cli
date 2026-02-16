/**
 * MetadataGenerator
 *
 * Generates feature metadata (slug, name, description) from user input.
 * Primary path: AI call via IAgentExecutorProvider
 * Fallback: Regex-based slug generation when AI fails
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
   * Generate feature metadata from user input via AI or fallback to regex.
   */
  async generateMetadata(userInput: string): Promise<FeatureMetadata> {
    try {
      const executor = this.executorProvider.getExecutor();

      const truncated =
        userInput.length > MAX_INPUT_FOR_AI
          ? `${userInput.slice(0, MAX_INPUT_FOR_AI)}...`
          : userInput;

      const prompt = `Generate feature metadata from this user request:
"${truncated}"

Return ONLY a JSON object with these fields:
- slug: kebab-case identifier, 2-4 words max (e.g., "github-oauth-login")
- name: short human-readable title (e.g., "GitHub OAuth Login")
- description: refined 1-2 sentence description

JSON only, no markdown fences.`;

      const result = await executor.execute(prompt, {
        maxTurns: 1,
        allowedTools: [],
        silent: true,
      });

      const parsed = JSON.parse(result.result);
      if (!parsed.slug || !parsed.name || !parsed.description) {
        throw new Error('Missing required fields in AI response');
      }

      return {
        slug: this.toSlug(parsed.slug),
        name: parsed.name,
        description: parsed.description,
      };
    } catch {
      // Fallback to regex-based slug generation
      return {
        slug: this.toSlug(userInput),
        name: userInput,
        description: userInput,
      };
    }
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
