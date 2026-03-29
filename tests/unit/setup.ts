/**
 * Global test setup for the node vitest project.
 *
 * Initializes CLI and TUI i18n so that any test importing
 * presentation-layer modules has translation functions available.
 */

import { initI18n as initCliI18n } from '../../src/presentation/cli/i18n.js';
import { initI18n as initTuiI18n } from '../../src/presentation/tui/i18n.js';

await Promise.all([initCliI18n('en'), initTuiI18n('en')]);
