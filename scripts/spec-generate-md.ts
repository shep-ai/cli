import yaml from 'js-yaml';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SUPPORTED_ARTIFACT_TYPES = ['feature', 'research', 'plan', 'tasks'] as const;
type ArtifactType = (typeof SUPPORTED_ARTIFACT_TYPES)[number];
type YamlData = Record<string, unknown>;

/**
 * Parse a YAML file and return the parsed object.
 */
export function parseYamlFile(filePath: string): YamlData {
  const content = readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(content);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Invalid YAML content in ${filePath}`);
  }
  return parsed as YamlData;
}

/**
 * Generate YAML front matter from metadata, omitting the `content` field.
 */
export function generateFrontMatter(metadata: YamlData): string {
  const { content: _content, ...filtered } = metadata;

  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(filtered)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const nested = yaml.dump(item, { flowLevel: -1 }).trimEnd();
            const [firstLine, ...restLines] = nested.split('\n');
            lines.push(`  - ${firstLine}`);
            for (const line of restLines) {
              lines.push(`    ${line}`);
            }
          } else {
            lines.push(`  - ${item}`);
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      const nested = yaml.dump({ [key]: value }, { flowLevel: -1 }).trimEnd();
      lines.push(nested);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Generate Markdown from a YAML spec file.
 * Returns front matter + content body.
 */
export function generateMarkdownFromYaml(yamlPath: string, artifactType: string): string {
  if (!SUPPORTED_ARTIFACT_TYPES.includes(artifactType as ArtifactType)) {
    throw new Error(
      `Unsupported artifact type: ${artifactType}. Supported: ${SUPPORTED_ARTIFACT_TYPES.join(', ')}`
    );
  }

  const data = parseYamlFile(yamlPath);

  if (!data.content) {
    throw new Error(`The content field is required in ${yamlPath}`);
  }

  const contentBody = String(data.content);
  const frontMatter = generateFrontMatter(data);

  return `${frontMatter}\n${contentBody}`;
}

const ARTIFACT_TYPE_TO_FILENAME: Record<ArtifactType, string> = {
  feature: 'spec',
  research: 'research',
  plan: 'plan',
  tasks: 'tasks',
};

// CLI entry point
/* eslint-disable no-console */
if (typeof process !== 'undefined' && process.argv[1]?.includes('spec-generate-md')) {
  const args = process.argv.slice(2);
  const featureIdx = args.indexOf('--feature');
  if (featureIdx === -1 || !args[featureIdx + 1]) {
    console.error('Usage: spec-generate-md --feature <feature-dir>');
    process.exit(1);
  }

  const featureDir = args[featureIdx + 1];

  for (const type of SUPPORTED_ARTIFACT_TYPES) {
    const yamlPath = join(featureDir, `${ARTIFACT_TYPE_TO_FILENAME[type]}.yaml`);
    if (existsSync(yamlPath)) {
      const md = generateMarkdownFromYaml(yamlPath, type);
      const mdPath = yamlPath.replace(/\.yaml$/, '.md');
      writeFileSync(mdPath, md, 'utf-8');
      console.log(`Generated: ${mdPath}`);
    }
  }
}
/* eslint-enable no-console */
