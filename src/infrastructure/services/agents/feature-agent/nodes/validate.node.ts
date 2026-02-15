import type { FeatureAgentState } from '../state.js';
import type { ValidationResult } from './schemas/validation.js';
import { readSpecFile, safeYamlLoad, createNodeLogger } from './node-helpers.js';

type SchemaValidator = (data: unknown) => ValidationResult;

/**
 * Factory that creates a validate node for a specific YAML file.
 *
 * On success: resets validationRetries to 0, clears errors.
 * On failure: increments validationRetries, sets errors for repair node.
 */
export function createValidateNode(
  filename: string,
  schema: SchemaValidator
): (state: FeatureAgentState) => Promise<Partial<FeatureAgentState>> {
  const log = createNodeLogger(`validate:${filename}`);

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
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
