/**
 * Agent Validator Service
 *
 * Infrastructure implementation of the IAgentValidator port.
 * Checks if AI agent binaries are available on the system by
 * executing `<binary> --version` via subprocess.
 *
 * Uses constructor dependency injection for the command executor
 * to enable testability without mocking node:child_process directly.
 */

import { injectable, inject } from 'tsyringe';

import type { AgentType } from '../../../domain/generated/output.js';
import type {
  IAgentValidator,
  AgentValidationResult,
} from '../../../application/ports/output/agent-validator.interface.js';
import type { ILogger } from '../../../application/ports/output/logger.interface.js';

/**
 * Type for the command executor dependency.
 * Matches the promisified signature of child_process.execFile.
 * Injected via constructor to avoid direct node module mocking in tests.
 */
export type ExecFunction = (
  file: string,
  args: string[]
) => Promise<{ stdout: string; stderr: string }>;

/**
 * Map of supported agent types to their binary command names.
 */
const AGENT_BINARY_MAP: Partial<Record<AgentType, string>> = {
  'claude-code': 'claude',
};

/**
 * Service that validates agent tool availability on the system.
 *
 * Checks if the agent binary exists and is executable by running
 * `<binary> --version` and parsing the output.
 */
@injectable()
export class AgentValidatorService implements IAgentValidator {
  private readonly execFn: ExecFunction;
  private readonly logger: ILogger;

  /**
   * @param execFn - Command executor function (injectable for testing).
   *   Uses execFile semantics (no shell) to prevent command injection.
   * @param logger - Logger instance for diagnostics
   */
  constructor(@inject('ExecFunction') execFn: ExecFunction, @inject('ILogger') logger: ILogger) {
    this.execFn = execFn;
    this.logger = logger;
  }

  /**
   * Check if the specified agent tool is available on the system.
   *
   * @param agentType - The agent type to check
   * @returns Validation result with availability status and version
   */
  async isAvailable(agentType: AgentType): Promise<AgentValidationResult> {
    const binary = AGENT_BINARY_MAP[agentType];

    if (!binary) {
      this.logger.debug('Agent type not supported', { agentType });
      return {
        available: false,
        error: `Agent type "${agentType}" is not supported yet`,
      };
    }

    try {
      this.logger.debug('Checking agent availability', { agentType, binary });
      const { stdout } = await this.execFn(binary, ['--version']);
      const version = stdout.trim();

      this.logger.info('Agent binary found', { agentType, binary, version });
      return {
        available: true,
        version,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn('Agent binary not found', {
        agentType,
        binary,
        error: message,
      });
      return {
        available: false,
        error: `Binary "${binary}" not found or not executable: ${message}`,
      };
    }
  }
}
