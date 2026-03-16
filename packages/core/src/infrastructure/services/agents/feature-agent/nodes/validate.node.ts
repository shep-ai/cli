import type { FeatureAgentState } from '../state.js';
import type { ValidationResult } from './schemas/validation.js';
import {
  readSpecFile,
  safeYamlLoad,
  createNodeLogger,
  getCompletedPhases,
} from './node-helpers.js';

type SchemaValidator = (data: unknown) => ValidationResult;

/**
 * Factory that creates a validate node for a specific YAML file.
 *
 * On success: resets validationRetries to 0, clears errors.
 * On failure: increments validationRetries, sets errors for repair node.
 *
 * @param successorPhase - The phase that runs AFTER this validation passes.
 *   If provided, skip validation when the successor is already completed — this
 *   proves the validation already passed in a prior run and the pipeline progressed
 *   beyond it. Checking the successor (not the producer) avoids skipping validation
 *   when the producer ran but validation itself failed.
 */
export function createValidateNode(
  filename: string,
  schema: SchemaValidator,
  successorPhase?: string
): (state: FeatureAgentState) => Promise<Partial<FeatureAgentState>> {
  const log = createNodeLogger(`validate:${filename}`);

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.activate();

    // Skip validation when the successor phase is already completed.
    // This means: the validation already passed in a prior run AND the next phase
    // ran successfully. On resume, LangGraph replays nodes from the last checkpoint.
    // The producer node skips (via getCompletedPhases), but if we only checked the
    // producer we'd also skip validation when it previously FAILED (since
    // markPhaseComplete runs before validation). Checking the successor is safe:
    // if the successor completed, this validation must have passed to get there.
    if (successorPhase && getCompletedPhases(state.specDir).includes(successorPhase)) {
      log.info(`Successor phase '${successorPhase}' already completed, skipping validation`);
      return {
        lastValidationTarget: filename,
        lastValidationErrors: [],
        validationRetries: 0,
        messages: [`[validate:${filename}] SKIP (successor '${successorPhase}' already completed)`],
      };
    }

    log.info(`Validating ${filename}`);

    const content = readSpecFile(state.specDir, filename);
    if (!content) {
      const errors = [`File '${filename}' not found or empty in ${state.specDir}`];
      log.error(errors[0]);
      return {
        lastValidationTarget: filename,
        lastValidationErrors: errors,
        validationRetries: state.validationRetries + 1,
        messages: [`[validate:${filename}] FAIL: ${errors[0]}`],
      };
    }

    // Try to parse
    let parsed: unknown;
    try {
      parsed = safeYamlLoad(content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const errors = [`YAML parse error in ${filename}: ${msg}`];
      log.error(errors[0]);
      return {
        lastValidationTarget: filename,
        lastValidationErrors: errors,
        validationRetries: state.validationRetries + 1,
        messages: [`[validate:${filename}] FAIL: parse error`],
      };
    }

    // Run schema validation
    const result = schema(parsed);
    if (result.valid) {
      log.info('Validation passed');
      return {
        lastValidationTarget: filename,
        lastValidationErrors: [],
        validationRetries: 0,
        messages: [`[validate:${filename}] PASS`],
      };
    }

    log.error(`Validation failed: ${result.errors.join('; ')}`);
    return {
      lastValidationTarget: filename,
      lastValidationErrors: result.errors,
      validationRetries: state.validationRetries + 1,
      messages: [`[validate:${filename}] FAIL: ${result.errors.length} error(s)`],
    };
  };
}
