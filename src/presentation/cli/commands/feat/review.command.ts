/**
 * Feature Review Command
 *
 * Shows the current state of a feature waiting for approval,
 * including which phase triggered the interrupt and generated content.
 *
 * Usage:
 *   shep feat review [id]
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Command } from 'commander';
import yaml from 'js-yaml';
import { container } from '@/infrastructure/di/container.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { FeatureSpec } from '@/domain/generated/output.js';
import { resolveWaitingFeature } from './resolve-waiting-feature.js';
import { colors, messages } from '../../ui/index.js';

export function createReviewCommand(): Command {
  return new Command('review')
    .description('Review a feature waiting for approval')
    .argument('[id]', 'Feature ID (auto-resolves if omitted)')
    .action(async (featureId?: string) => {
      try {
        const featureRepo = container.resolve<IFeatureRepository>('IFeatureRepository');
        const runRepo = container.resolve<IAgentRunRepository>('IAgentRunRepository');
        const repoPath = process.cwd();

        const { feature, run } = await resolveWaitingFeature({
          featureId,
          repoPath,
          featureRepo,
          runRepo,
        });

        const phase = run.result?.startsWith('node:') ? run.result.slice(5) : 'unknown';

        messages.newline();
        messages.info(`Feature waiting for approval: ${colors.accent(feature.name)}`);
        console.log(`  ${colors.muted('ID:')}     ${feature.id.slice(0, 8)}`);
        console.log(`  ${colors.muted('Phase:')}  ${colors.warning(phase)}`);
        console.log(`  ${colors.muted('Branch:')} ${colors.accent(feature.branch)}`);
        if (feature.specPath) {
          console.log(`  ${colors.muted('Specs:')}  ${feature.specPath}`);
        }

        // PRD Spec display: show when awaiting PRD approval at requirements node
        if (feature.specPath && run.result === 'node:requirements') {
          try {
            const raw = readFileSync(join(feature.specPath, 'spec.yaml'), 'utf-8');
            const spec = yaml.load(raw) as FeatureSpec;

            messages.newline();
            console.log(`  ${colors.muted('PRD Spec:')}`);

            if (spec.summary) {
              console.log(`  ${spec.summary.trim()}`);
            }

            if (spec.openQuestions?.length) {
              console.log('');
              console.log(`  ${colors.muted('Open Questions:')}`);
              for (const q of spec.openQuestions) {
                const prefix = q.resolved ? colors.success('[RESOLVED]') : colors.warning('[OPEN]');
                console.log(`    ${prefix} ${q.question}`);
                if (q.resolved && q.answer) {
                  console.log(`      ${colors.muted(q.answer.trim())}`);
                }
              }
            }

            if (spec.content) {
              const contentLines = spec.content.split('\n');
              const MAX_LINES = 50;
              const truncated = contentLines.length > MAX_LINES;
              console.log('');
              for (const line of contentLines.slice(0, MAX_LINES)) {
                console.log(`  ${line}`);
              }
              if (truncated) {
                console.log(
                  `  ${colors.muted(`[truncated — see full spec at ${feature.specPath}/spec.yaml]`)}`
                );
              }
            }
          } catch {
            // Silently omit PRD section if spec.yaml cannot be read or parsed
          }
        }

        messages.newline();
        console.log(`  ${colors.muted('To approve:')} shep feat approve ${feature.id.slice(0, 8)}`);
        console.log(`  ${colors.muted('To reject:')}  shep feat reject ${feature.id.slice(0, 8)}`);
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to review feature', err);
        process.exitCode = 1;
      }
    });
}
