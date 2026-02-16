# Manual Integration Tests

This directory contains **manual integration tests** that use real dependencies (not mocked) and must be run explicitly.

⚠️ **These tests are EXCLUDED from automated runs:**

- `pnpm test` (standard test suite)
- `pnpm test:watch` (watch mode)
- CI/CD pipelines
- Pre-commit hooks

## Why Manual Tests?

These tests verify behavior with **real agent executors, real database connections, and real API calls**. They're useful for:

✅ Verifying AI agent integration (metadata generation, planning, etc.)
✅ Integration testing with external services (Claude API, etc.)
✅ End-to-end feature validation
✅ Debugging production issues

## How to Run

### Via IDE (Recommended)

1. Open the test file (e.g., `metadata-generator.manual.test.ts`)
2. Click the **▶️ Run** button above the test or test suite
3. Or right-click and select "Run Test"

### Via CLI

```bash
# Run all manual tests once
pnpm test:manual

# Run in watch mode (re-run on file changes)
pnpm test:manual:watch

# Run a specific file
pnpm test:manual -- metadata-generator.manual.test.ts

# Run with verbose output
pnpm test:manual -- --reporter=verbose
```

## Requirements

### Agent Configuration

Manual tests use **your local agent settings** (stored in `~/.shep/data`).

**No environment variables needed!** Tests automatically use whatever agent is configured in your settings:

```bash
# Your settings are automatically loaded from: ~/.shep/data
# Just run the tests with your agent already configured
pnpm test:manual
```

If you haven't configured an agent yet:

```bash
# Configure your agent (one-time setup)
pnpm cli settings agent

# Then run tests - they'll use your configured agent
pnpm test:manual
```

### Database

Tests use your real SQLite database at `~/.shep/data` with your configured agent defaults. This is the same database your CLI uses—no test-specific setup needed!

## Test Naming Convention

Manual tests use the `.manual.test.ts` or `.manual.test.tsx` naming convention to distinguish them from standard unit tests.

## AI Detection in Tests

Tests now include **AI working detection** by checking slug word count:

**How to detect if AI is working:**

| Slug Word Count | Status              | Example                                     |
| --------------- | ------------------- | ------------------------------------------- |
| **2-5 words**   | ✅ AI working       | `dark-mode-toggle`                          |
| **6-8 words**   | ⚠️ Partial fallback | `add-dark-mode-toggle-to-the`               |
| **9+ words**    | ❌ Full fallback    | `add-dark-mode-toggle-to-the-settings-page` |

**Why this matters:**

- **Good AI response**: Condenses long input to 2-5 word slug (e.g., "Add dark mode toggle" → "dark-mode-toggle")
- **Fallback response**: Uses full input as slug (e.g., "Add dark mode toggle" → "add-dark-mode-toggle-to-the-settings-page")

Test output tells you status:

```
⚡ AI Working Check: slug word count = 8
  ⚠️  Slug has 8 words - looks like FALLBACK (not AI)
  Expected AI to condense to 2-5 words, got full input instead
```

## Examples

### Example 1: MetadataGenerator with Real Agent

```typescript
import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeContainer, container } from '@/infrastructure/di/container';
import { MetadataGenerator } from '@/application/use-cases/features/create/metadata-generator';

describe('MetadataGenerator (MANUAL - Real Agent)', () => {
  let generator: MetadataGenerator;

  beforeAll(async () => {
    await initializeContainer();
    generator = container.resolve(MetadataGenerator);
  });

  it('should generate metadata with real AI executor', async () => {
    const metadata = await generator.generateMetadata('Add dark mode toggle');

    expect(metadata.slug).toBeDefined();
    expect(metadata.name).toBeDefined();
    expect(metadata.description).toBeDefined();

    // Check if AI is working by slug word count
    const wordCount = metadata.slug.split('-').length;
    console.log(`Slug has ${wordCount} words (AI: ${wordCount <= 5 ? '✅' : '❌'})`);
  });
});
```

## Notes

- ⏱️ Manual tests may take longer due to API calls (default timeout: 30 seconds)
- 🔄 Results may vary based on agent responses
- 📝 Output is logged to console for inspection
- 🚫 Don't commit credentials or tokens to git
- 💰 API calls may incur costs (depending on your agent)

## Troubleshooting

### Test hangs or times out

- Check agent is configured: `pnpm cli settings show`
- Verify network connectivity to your agent service
- Check that your agent token is valid
- Increase timeout if needed: edit `vitest.config.manual.mjs` (change `testTimeout`)

### "Cannot resolve module" errors

- Ensure TypeScript paths are configured in `tsconfig.json`
- Run `pnpm generate` to regenerate TypeSpec output

### Database permission errors

- Check `~/.shep/` directory exists and is readable
- Delete `~/.shep/data` and let the test recreate it

## Adding New Manual Tests

1. Create a file: `tests/manual/my-feature.manual.test.ts`
2. Use `.manual.test.ts` extension (must match vitest.config.manual.ts pattern)
3. Import `reflect-metadata` at the top
4. Initialize container in `beforeAll`
5. Inject real dependencies from container
6. Write assertions
7. Run via IDE or `pnpm test:manual`

Example:

```typescript
import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import { initializeContainer, container } from '@/infrastructure/di/container';
import { MyService } from '@/path/to/service';

describe('MyService (MANUAL)', () => {
  let service: MyService;

  beforeAll(async () => {
    await initializeContainer();
    service = container.resolve(MyService);
  });

  it('should do something with real dependencies', async () => {
    const result = await service.myMethod();
    expect(result).toBeDefined();
  });
});
```

---

💡 **Pro tip:** Use manual tests during development to validate integration points before committing to the main test suite.
