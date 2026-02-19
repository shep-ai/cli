/**
 * Generates a pr.yaml file from spec metadata for pull request creation.
 *
 * Reads spec.yaml from the spec directory, extracts feature name, description,
 * scope, and success criteria, then writes a pr.yaml with PR metadata in
 * conventional commit format.
 */

import yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface SpecData {
  name?: string;
  description?: string;
  scope?: string;
  successCriteria?: string[];
}

interface PrYamlData {
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  labels: string[];
  draft: boolean;
}

/**
 * Generate a pr.yaml file in the spec directory with PR metadata.
 *
 * @param specDir - Path to the spec directory containing spec.yaml
 * @param branch - Feature branch name (used as headBranch)
 * @param baseBranch - Target branch for the PR (default: 'main')
 * @returns Path to the generated pr.yaml file
 */
export function generatePrYaml(specDir: string, branch: string, baseBranch = 'main'): string {
  const specContent = readFileSync(join(specDir, 'spec.yaml'), 'utf-8');
  const spec = yaml.load(specContent) as SpecData;

  const name = spec.name ?? 'Untitled feature';
  const description = spec.description ?? '';
  const scope = spec.scope;
  const successCriteria = spec.successCriteria ?? [];

  const title = scope ? `feat(${scope}): ${name}` : `feat: ${name}`;

  const bodyParts: string[] = [];
  bodyParts.push(`## Summary\n\n${description}`);

  if (successCriteria.length > 0) {
    bodyParts.push(`## Test Criteria\n\n${successCriteria.map((c) => `- ${c}`).join('\n')}`);
  }

  const prData: PrYamlData = {
    title,
    body: bodyParts.join('\n\n'),
    baseBranch,
    headBranch: branch,
    labels: ['feature'],
    draft: false,
  };

  const outputPath = join(specDir, 'pr.yaml');
  writeFileSync(outputPath, yaml.dump(prData, { indent: 2, lineWidth: -1 }), 'utf-8');

  return outputPath;
}
