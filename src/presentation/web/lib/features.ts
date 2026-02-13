import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface Feature {
  id: string;
  name: string;
  description?: string;
  branch?: string;
  lifecycle: string;
  status?: {
    phase: string;
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

interface FeatureYaml {
  feature: {
    id: string;
    name: string;
    description?: string;
    branch?: string;
    lifecycle: string;
  };
  status?: {
    phase: string;
    progress: {
      completed: number;
      total: number;
      percentage: number;
    };
  };
}

function findRoot(currentDir: string): string | null {
  if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
    return currentDir;
  }
  const parent = path.dirname(currentDir);
  if (parent === currentDir) return null;
  return findRoot(parent);
}

export async function getFeatures(): Promise<Feature[]> {
  const root = findRoot(process.cwd());
  if (!root) {
    // eslint-disable-next-line no-console
    console.error('Could not find workspace root');
    return [];
  }

  const specsDir = path.join(root, 'specs');
  if (!fs.existsSync(specsDir)) {
    // eslint-disable-next-line no-console
    console.warn('specs directory not found at', specsDir);
    return [];
  }

  const features: Feature[] = [];
  const entries = fs.readdirSync(specsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const featureYamlPath = path.join(specsDir, entry.name, 'feature.yaml');
      if (fs.existsSync(featureYamlPath)) {
        try {
          const content = fs.readFileSync(featureYamlPath, 'utf8');
          const data = yaml.load(content) as FeatureYaml;
          if (data?.feature) {
            features.push({
              id: data.feature.id,
              name: data.feature.name,
              description: data.feature.description,
              branch: data.feature.branch,
              lifecycle: data.feature.lifecycle,
              status: data.status,
            });
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error parsing ${featureYamlPath}:`, error);
        }
      }
    }
  }

  return features;
}
