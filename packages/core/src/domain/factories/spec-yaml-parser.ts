/**
 * Spec YAML Parser
 *
 * Parses raw YAML strings from spec artifact files into their TypeSpec-generated types.
 * Uses AJV with the generated JSON Schema files for validation, then casts directly
 * to the TypeScript types — no manual field-by-field extraction needed.
 */

// @ts-expect-error -- ajv/dist/2020.js has no type declarations
import Ajv2020 from 'ajv/dist/2020.js';
import yaml from 'js-yaml';
import { readdirSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type {
  FeatureArtifact,
  ResearchArtifact,
  TechnicalPlanArtifact,
  TasksArtifact,
  FeatureStatus,
} from '../generated/output';

// ---------------------------------------------------------------------------
// Schema loader — loads all JSON Schema YAML files from apis/json-schema/
// ---------------------------------------------------------------------------

/** Resolve the apis/json-schema directory relative to the project root */
function resolveSchemaDir(): string {
  return join(process.cwd(), 'apis', 'json-schema');
}

function createValidator(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const schemaDir = resolveSchemaDir();
  const files = readdirSync(schemaDir).filter((f) => f.endsWith('.yaml'));

  for (const file of files) {
    const content = readFileSync(join(schemaDir, file), 'utf-8');
    const schema = yaml.load(content) as Record<string, unknown>;
    ajv.addSchema(schema, schema.$id as string);
  }

  return ajv;
}

// Lazily initialized singleton
let _ajv: Ajv2020 | null = null;

function getValidator(): Ajv2020 {
  _ajv ??= createValidator();
  return _ajv;
}

function validateSchema<T>(schemaId: string, data: unknown): T {
  const ajv = getValidator();
  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    throw new Error(`Schema not found: ${schemaId}`);
  }
  if (!validate(data)) {
    const errors = validate.errors
      ?.map((e: { instancePath: string; message?: string }) => `${e.instancePath} ${e.message}`)
      .join('; ');
    throw new Error(`Validation failed for ${schemaId}: ${errors}`);
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Pre-processing helpers
// ---------------------------------------------------------------------------

/** Recursively strip null values from an object (YAML null → absent key for JSON Schema) */
function stripNulls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(stripNulls);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value !== null && value !== undefined) {
        result[key] = stripNulls(value);
      }
    }
    return result;
  }
  return obj;
}

/** Inject default BaseEntity fields if missing */
function injectBaseEntityDefaults(data: Record<string, unknown>): void {
  const now = new Date().toISOString();
  data.id ??= randomUUID();
  data.createdAt ??= now;
  data.updatedAt ??= now;
}

// ---------------------------------------------------------------------------
// Public Parsers
// ---------------------------------------------------------------------------

/**
 * Parse a spec.yaml string into a FeatureArtifact object.
 */
export function parseSpecYaml(content: string): FeatureArtifact {
  const raw = stripNulls(yaml.load(content)) as Record<string, unknown>;
  injectBaseEntityDefaults(raw);
  return validateSchema<FeatureArtifact>('FeatureArtifact.yaml', raw);
}

/**
 * Parse a research.yaml string into a ResearchArtifact object.
 */
export function parseResearchYaml(content: string): ResearchArtifact {
  const raw = stripNulls(yaml.load(content)) as Record<string, unknown>;
  injectBaseEntityDefaults(raw);
  return validateSchema<ResearchArtifact>('ResearchArtifact.yaml', raw);
}

/**
 * Parse a plan.yaml string into a TechnicalPlanArtifact object.
 */
export function parsePlanYaml(content: string): TechnicalPlanArtifact {
  const raw = stripNulls(yaml.load(content)) as Record<string, unknown>;
  injectBaseEntityDefaults(raw);
  return validateSchema<TechnicalPlanArtifact>('TechnicalPlanArtifact.yaml', raw);
}

/**
 * Parse a tasks.yaml string into a TasksArtifact object.
 */
export function parseTasksYaml(content: string): TasksArtifact {
  const raw = stripNulls(yaml.load(content)) as Record<string, unknown>;
  injectBaseEntityDefaults(raw);
  return validateSchema<TasksArtifact>('TasksArtifact.yaml', raw);
}

/**
 * Parse a feature.yaml string into a FeatureStatus object.
 */
export function parseFeatureStatusYaml(content: string): FeatureStatus {
  const raw = stripNulls(yaml.load(content)) as Record<string, unknown>;
  injectBaseEntityDefaults(raw);
  return validateSchema<FeatureStatus>('FeatureStatus.yaml', raw);
}
