/**
 * lint-staged Configuration
 *
 * Runs linters on staged files before commit.
 * This ensures only clean, formatted code gets committed.
 *
 * @see https://github.com/lint-staged/lint-staged
 */

export default {
  // TypeSpec files - format with Prettier
  '*.tsp': ['prettier --write'],

  // TypeScript/JavaScript files - lint and format
  '*.{ts,tsx,mts,cts}': ['eslint --fix', 'prettier --write'],
  '*.{js,jsx,mjs,cjs}': ['eslint --fix', 'prettier --write'],

  // JSON, YAML, Markdown - format only
  '*.{json,yaml,yml}': ['prettier --write'],
  '*.md': ['prettier --write'],

  // Package.json - sort and format
  'package.json': ['prettier --write'],
};
