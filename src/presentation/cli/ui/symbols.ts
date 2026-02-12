/**
 * CLI Design System - Symbols
 *
 * Unicode symbols for visual feedback in terminal output.
 * Includes ASCII fallbacks for non-UTF8 terminals.
 *
 * @example
 * import { symbols } from './symbols';
 * console.log(`${symbols.success} Done!`);
 */

/**
 * Detect if terminal supports Unicode
 */
const isUnicodeSupported = (): boolean => {
  // Windows Terminal and modern terminals support Unicode
  if (process.env.WT_SESSION) return true;
  if (process.env.TERM_PROGRAM === 'vscode') return true;
  if (process.env.TERM === 'xterm-256color') return true;

  // Legacy Windows CMD/PowerShell may not
  if (process.platform === 'win32') {
    const { env } = process;
    // Check for modern terminal indicators on Windows
    const isModernTerminal =
      Boolean(env.CI) ||
      Boolean(env.WT_SESSION) ||
      Boolean(env.TERMINUS_SUBLIME) ||
      env.ConEmuTask === '{cmd::Cmder}' ||
      env.TERM_PROGRAM === 'Terminus-Sublime' ||
      env.TERM_PROGRAM === 'vscode' ||
      env.TERM === 'xterm-256color' ||
      env.TERM === 'alacritty' ||
      env.TERMINAL_EMULATOR === 'JetBrains-JediTerm';
    return isModernTerminal;
  }

  // Unix-like systems generally support Unicode
  return process.env.TERM !== 'linux';
};

const unicode = isUnicodeSupported();

/**
 * Unicode symbols with ASCII fallbacks
 */
export const symbols = {
  /** Success checkmark */
  success: unicode ? '✓' : '√',
  /** Error cross */
  error: unicode ? '✗' : '×',
  /** Warning triangle */
  warning: unicode ? '⚠' : '‼',
  /** Info circle */
  info: unicode ? 'ℹ' : 'i',
  /** Arrow/pointer */
  arrow: unicode ? '→' : '->',
  /** Bullet point */
  bullet: unicode ? '•' : '*',
  /** Pointer right */
  pointer: unicode ? '❯' : '>',
  /** Ellipsis for loading/truncation */
  ellipsis: unicode ? '…' : '...',
  /** Filled status dot */
  dot: unicode ? '●' : '*',
  /** Empty status dot */
  dotEmpty: unicode ? '○' : 'o',
  /** Line separator */
  line: unicode ? '─' : '-',
  /** Spinner frames for loading animation */
  spinner: unicode ? ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] : ['|', '/', '-', '\\'],
} as const;

export type Symbols = typeof symbols;
