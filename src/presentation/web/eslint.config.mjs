/**
 * ESLint config for @shepai/web package
 *
 * Extends root config and adds web-specific ignores.
 * Uses ESLint 9 flat config format.
 */

import rootConfig from '../../../eslint.config.mjs';

export default [
  // Inherit all root configuration
  ...rootConfig,

  // Web-specific ignores
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
];
