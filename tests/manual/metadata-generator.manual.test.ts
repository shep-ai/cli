/**
 * MANUAL TEST: MetadataGenerator with Real Agent Executor
 *
 * This test uses the REAL IAgentExecutor (not mocked) to generate feature metadata
 * using your configured agent from ~/.shep/data (local settings database).
 *
 * Run manually only:
 * - In IDE: Click the Run button or use Vitest UI
 * - CLI: pnpm test:manual
 * - NOT included in: pnpm test, pnpm test:watch, CI/CD pipelines
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import { container, initializeContainer } from '@/infrastructure/di/container';
import { InitializeSettingsUseCase } from '@/application/use-cases/settings/initialize-settings.use-case';
import { initializeSettings } from '@/infrastructure/services/settings.service';
import { MetadataGenerator } from '@/application/use-cases/features/create/metadata-generator';

describe('MetadataGenerator (MANUAL - Real Agent Executor)', () => {
  let generator: MetadataGenerator;

  // Initialize container and settings (same as CLI bootstrap)
  beforeAll(async () => {
    await initializeContainer();
    const settingsUseCase = container.resolve(InitializeSettingsUseCase);
    const settings = await settingsUseCase.execute();
    initializeSettings(settings);
    generator = container.resolve(MetadataGenerator);
  });

  it('should generate metadata from real AI executor', async () => {
    const userInput = 'Add dark mode toggle to the settings page';

    const metadata = await generator.generateMetadata(userInput);
    console.log(JSON.stringify(metadata));
    expect(metadata.slug).toMatch(/^[a-z0-9-]+$/);
    expect(metadata.slug.length).toBeLessThanOrEqual(50);
    expect(metadata.name.length).toBeGreaterThan(0);
    expect(metadata.description.length).toBeGreaterThan(0);

    console.log('\n Generated Metadata:');
    console.log(`  Input:       "${userInput}"`);
    console.log(`  Slug:        "${metadata.slug}"`);
    console.log(`  Name:        "${metadata.name}"`);
    console.log(`  Description: "${metadata.description}"`);
  });
});
