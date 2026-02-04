/**
 * lint-staged Configuration
 *
 * Runs linters on staged files before commit.
 * This ensures only clean, formatted code gets committed.
 *
 * Functions returning commands (without using file list) run once per batch.
 *
 * @see https://github.com/lint-staged/lint-staged
 */

export default {
  // TypeSpec files - format and compile
  '*.tsp': ['prettier --write', () => 'pnpm run tsp:compile'],

  // TypeScript files - lint, format, and typecheck
  // Note: Includes src/domain/generated/**/*.ts (TypeSpec-generated files)
  '*.{ts,tsx,mts,cts}': ['eslint --fix', 'prettier --write', () => 'pnpm run typecheck'],

  // JavaScript files - lint and format
  '*.{js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],

  // JSON, YAML, Markdown - format only
  '*.{json,yaml,yml}': ['prettier --write'],
  '*.md': ['prettier --write'],

  // Package.json - sort and format
  'package.json': ['prettier --write'],
};
