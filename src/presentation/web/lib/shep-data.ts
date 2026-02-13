import fs from 'fs';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';

export interface GlobalFeature {
  repoId: string;
  repoPath: string; // The encoded path or hash
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
      percentage: number;
    };
  };
}

export function getShepHomeDir(): string {
  return path.join(os.homedir(), '.shep');
}

export async function getGlobalFeatures(): Promise<GlobalFeature[]> {
  const reposDir = path.join(getShepHomeDir(), 'repos');
  const features: GlobalFeature[] = [];

  if (!fs.existsSync(reposDir)) {
    return [];
  }

  const repoEntries = fs.readdirSync(reposDir, { withFileTypes: true });

  for (const repoEntry of repoEntries) {
    if (!repoEntry.isDirectory()) continue;

    const repoId = repoEntry.name;
    const wtDir = path.join(reposDir, repoId, 'wt');

    if (!fs.existsSync(wtDir)) continue;

    const branchEntries = fs.readdirSync(wtDir, { withFileTypes: true });

    for (const branchEntry of branchEntries) {
      if (!branchEntry.isDirectory()) continue;

      const specsDir = path.join(wtDir, branchEntry.name, 'specs');
      if (!fs.existsSync(specsDir)) continue;

      const featureEntries = fs.readdirSync(specsDir, { withFileTypes: true });

      for (const featureEntry of featureEntries) {
        if (!featureEntry.isDirectory()) continue;

        const featureYamlPath = path.join(specsDir, featureEntry.name, 'feature.yaml');
        if (fs.existsSync(featureYamlPath)) {
          try {
            const content = fs.readFileSync(featureYamlPath, 'utf8');
            const data = yaml.load(content) as {
              feature: GlobalFeature['feature'];
              status: GlobalFeature['status'];
            };

            if (data?.feature) {
              features.push({
                repoId: repoId,
                repoPath: repoId, // Using ID as path for now
                feature: {
                  id: data.feature.id,
                  name: data.feature.name,
                  description: data.feature.description,
                  branch: data.feature.branch,
                  lifecycle: data.feature.lifecycle,
                },
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
  }

  return features;
}
