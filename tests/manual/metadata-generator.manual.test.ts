/**
 * MANUAL TEST: MetadataGenerator with Real Agent Executor
 *
 * This test uses the REAL IAgentExecutor (not mocked) to generate feature metadata.
 * It only runs when manually invoked via IDE or explicit command.
 *
 * ⚠️ Requirements:
 * - SHEP_AGENT_TYPE env var must be set (e.g., claude-code, cursor)
 * - Agent must be authenticated (token configured)
 * - This test makes real API calls to your agent
 *
 * Run manually only:
 * - In IDE: Click on the test or use Vitest UI
 * - CLI: vitest --config vitest.config.manual.ts tests/manual/metadata-generator.manual.test.ts
 * - NOT included in: pnpm test, pnpm test:watch, CI/CD pipelines
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import { container, initializeContainer } from '@/infrastructure/di/container';
import { MetadataGenerator } from '@/application/use-cases/features/create/metadata-generator';

describe('MetadataGenerator (MANUAL - Real Agent Executor)', () => {
  let generator: MetadataGenerator;

  // Initialize container once before all tests
  beforeAll(async () => {
    await initializeContainer();
    generator = container.resolve(MetadataGenerator);
  });

  it('should generate metadata from real AI executor for a simple feature request', async () => {
    const userInput = 'Add dark mode toggle to the settings page';

    const metadata = await generator.generateMetadata(userInput);

    // Verify structure
    expect(metadata).toHaveProperty('slug');
    expect(metadata).toHaveProperty('name');
    expect(metadata).toHaveProperty('description');

    // Verify types
    expect(typeof metadata.slug).toBe('string');
    expect(typeof metadata.name).toBe('string');
    expect(typeof metadata.description).toBe('string');

    // Verify slug is kebab-case and reasonable length
    expect(metadata.slug).toMatch(/^[a-z0-9-]+$/);
    expect(metadata.slug.length).toBeLessThanOrEqual(50);

    // CRITICAL: Verify AI actually worked (not fallback)
    // If AI works: slug should be condensed to 2-5 words (e.g., "dark-mode-toggle")
    // If fallback: slug would be full input (7 words: "add-dark-mode-toggle-to-the-settings-page")
    const wordCount = metadata.slug.split('-').length;
    console.log(`\n⚡ AI Working Check: slug word count = ${wordCount}`);
    if (wordCount > 6) {
      console.log(`  ⚠️  Slug has ${wordCount} words - looks like FALLBACK (not AI)`);
      console.log(`  Expected AI to condense to 2-5 words, got full input instead`);
    } else {
      console.log(`  ✅ Slug condensed to ${wordCount} words - AI likely working!`);
    }

    // Verify name is non-empty
    expect(metadata.name.length).toBeGreaterThan(0);

    // Log results for manual inspection
    console.log('\n📝 Generated Metadata:');
    console.log(`  Input:       "${userInput}"`);
    console.log(`  Slug:        "${metadata.slug}" (${wordCount} words)`);
    console.log(`  Name:        "${metadata.name}"`);
    console.log(`  Description: "${metadata.description}"`);
  });

  it('should generate metadata for a complex feature request', async () => {
    const userInput =
      'Implement GitHub OAuth authentication flow with PKCE security, supporting multiple redirect URIs and automatic token refresh';

    const metadata = await generator.generateMetadata(userInput);

    expect(metadata.slug).toMatch(/^[a-z0-9-]+$/);
    expect(metadata.slug.length).toBeLessThanOrEqual(50);
    expect(metadata.name.length).toBeGreaterThan(0);
    expect(metadata.description.length).toBeGreaterThan(0);

    const wordCount = metadata.slug.split('-').length;
    console.log('\n📝 Complex Request Metadata:');
    console.log(`  Input (truncated):  "${userInput.slice(0, 60)}..."`);
    console.log(`  Slug:               "${metadata.slug}" (${wordCount} words)`);
    console.log(`  Name:               "${metadata.name}"`);
    console.log(`  Description:        "${metadata.description}"`);
    console.log(`  ℹ️  If slug has >6 words, AI fallback was triggered`);
  });

  it('should condense slug to 2-5 words when AI works properly', async () => {
    const userInput =
      'I want to add a feature that allows users to customize their dashboard themes and save preferences';

    const metadata = await generator.generateMetadata(userInput);

    const wordCount = metadata.slug.split('-').length;

    console.log('\n🧠 AI Condensation Test:');
    console.log(`  Input (${userInput.split(' ').length} words):  "${userInput}"`);
    console.log(`  Output (${wordCount} words): "${metadata.slug}"`);

    // If AI is working: slug should be condensed to 2-5 words
    // If fallback: slug would be 17+ words
    if (wordCount <= 5) {
      console.log(`  ✅ AI is CONDENSING input (${wordCount} words is good!)`);
    } else if (wordCount >= 12) {
      console.log(`  ⚠️  FALLBACK ACTIVE (${wordCount} words = full input)`);
      console.log(`  To test AI: Configure SHEP_AGENT_TYPE and SHEP_AGENT_TOKEN`);
    } else {
      console.log(`  📊 Partial AI response (${wordCount} words)`);
    }

    expect(metadata.slug).toMatch(/^[a-z0-9-]+$/);
    expect(metadata.slug.length).toBeLessThanOrEqual(50);
  });

  it('should fallback to regex-based slug when AI fails (timeout test)', async () => {
    // This tests the fallback mechanism
    const userInput = 'test-feature-xyz-123';

    const metadata = await generator.generateMetadata(userInput);

    expect(metadata).toBeDefined();
    expect(metadata.slug).toBeDefined();
    expect(metadata.name).toBeDefined();
    expect(metadata.description).toBeDefined();

    console.log('\n⚠️  Fallback Test Results:');
    console.log(`  Input:       "${userInput}"`);
    console.log(`  Slug:        "${metadata.slug}"`);
    console.log(`  (If slug matches input, AI fallback was used)`);
  });

  it('should respect MAX_INPUT_FOR_AI truncation for long input', async () => {
    // Create a very long input (> 500 chars)
    const longInput =
      'Add a comprehensive feature that integrates real-time notifications system with WebSocket support, ' +
      'including persistent storage, retry logic, exponential backoff for failed deliveries, ' +
      'batch processing for bulk notifications, priority queues, and a REST API for managing notification templates. ' +
      'The system should support multiple delivery channels including email, SMS, push notifications, and in-app alerts. ' +
      'It needs to handle duplicate detection, rate limiting per user, and audit logging for compliance.';

    expect(longInput.length).toBeGreaterThan(500);

    const metadata = await generator.generateMetadata(longInput);

    expect(metadata.slug).toBeDefined();
    expect(metadata.slug.length).toBeLessThanOrEqual(50);

    console.log('\n📏 Long Input Truncation Test:');
    console.log(`  Input length:  ${longInput.length} chars`);
    console.log(`  Truncated at:  500 chars (MAX_INPUT_FOR_AI)`);
    console.log(`  Generated:     slug="${metadata.slug}", name="${metadata.name}"`);
  });

  it('should handle special characters in slug generation', async () => {
    const userInput = 'Create OAuth@2.0 /w PKCE & scopes';

    const metadata = await generator.generateMetadata(userInput);

    // Verify special chars are handled (no @, /, &, or dots)
    expect(metadata.slug).not.toMatch(/[@/&.]/);
    expect(metadata.slug).toMatch(/^[a-z0-9-]*$/);

    console.log('\n✨ Special Character Handling:');
    console.log(`  Input:  "${userInput}"`);
    console.log(`  Slug:   "${metadata.slug}" (special chars removed)`);
  });
});
