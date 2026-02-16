/**
 * Mock Agent Executor
 *
 * Deterministic executor for E2E tests. Returns predictable responses
 * so tests can assert on exact slugs, names, and descriptions.
 *
 * Activated via SHEP_MOCK_EXECUTOR=1 environment variable.
 */

import type { AgentType, AgentFeature } from '../../../../../domain/generated/output.js';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
  AgentExecutionResult,
  AgentExecutionStreamEvent,
} from '../../../../../application/ports/output/agents/agent-executor.interface.js';

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function toTitleCase(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Extract the quoted user input from the metadata generation prompt.
 * Prompt format: `...User request:\n"<input>"\n...`
 */
function extractUserInput(prompt: string): string | null {
  const match = prompt.match(/User request:\n"(.+?)"\n/s);
  return match ? match[1] : null;
}

export class MockAgentExecutorService implements IAgentExecutor {
  readonly agentType: AgentType = 'claude-code' as AgentType;

  async execute(prompt: string, _options?: AgentExecutionOptions): Promise<AgentExecutionResult> {
    const userInput = extractUserInput(prompt);

    if (userInput) {
      const slug = toSlug(userInput);
      const name = toTitleCase(userInput);
      return {
        result: JSON.stringify({ slug, name, description: userInput }),
      };
    }

    // Default fallback for any other prompt
    return { result: '{}' };
  }

  async *executeStream(
    prompt: string,
    options?: AgentExecutionOptions
  ): AsyncIterable<AgentExecutionStreamEvent> {
    const result = await this.execute(prompt, options);
    yield { type: 'result', content: result.result, timestamp: new Date() };
  }

  supportsFeature(_feature: AgentFeature): boolean {
    return false;
  }
}
