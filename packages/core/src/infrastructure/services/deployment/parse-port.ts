/**
 * Parse Port
 *
 * Pure utility that extracts a localhost URL or port number from a line of
 * dev server stdout/stderr output. Handles common patterns from Next.js,
 * Vite, Express, and generic servers.
 */

/** Named patterns for port/URL detection, checked in order */
const PORT_PATTERNS: {
  name: string;
  regex: RegExp;
  extract: (match: RegExpMatchArray) => string;
}[] = [
  {
    name: 'local-url',
    // Matches "Local: http://localhost:3000" or "- Local: http://localhost:5173/"
    regex: /Local:\s+(https?:\/\/(?:localhost|127\.0\.0\.1):\d+\S*)/,
    extract: (m) => m[1],
  },
  {
    name: 'next-ready',
    // Matches "ready - started server on 0.0.0.0:3000, url: http://localhost:3000"
    regex: /url:\s+(https?:\/\/(?:localhost|127\.0\.0\.1):\d+\S*)/,
    extract: (m) => m[1],
  },
  {
    name: 'listening-port',
    // Matches "listening on port 3000", "started on port 9000", etc.
    regex: /(?:listening|started)\s+on\s+port\s+(\d+)/i,
    extract: (m) => `http://localhost:${m[1]}`,
  },
  {
    name: 'generic-localhost',
    // Matches any "http://localhost:PORT" or "https://localhost:PORT" in the line
    regex: /(https?:\/\/(?:localhost|127\.0\.0\.1):\d+\S*)/,
    extract: (m) => m[1],
  },
];

/**
 * Parse a line of stdout/stderr output for a localhost URL or port.
 *
 * @param line - A single line of process output
 * @returns The detected URL string, or null if no URL/port was found
 */
export function parsePort(line: string): string | null {
  if (!line?.trim()) {
    return null;
  }

  for (const { regex, extract } of PORT_PATTERNS) {
    const match = line.match(regex);
    if (match) {
      return extract(match);
    }
  }

  return null;
}
