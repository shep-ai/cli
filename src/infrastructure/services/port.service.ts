/**
 * Port Service
 *
 * Port availability checking and auto-increment logic for the web server.
 * Uses node:net try-bind pattern (same approach as Vite).
 */

import net from 'node:net';

/** Default port for the Shep web UI */
export const DEFAULT_PORT = 4050;

/** Maximum number of ports to try before giving up */
export const MAX_PORT_ATTEMPTS = 20;

const MIN_PORT = 1024;
const MAX_PORT = 65535;

/**
 * Check if a port is available by attempting to bind to it.
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '127.0.0.1');
  });
}

/**
 * Find an available port starting from `startPort`, incrementing up to `maxAttempts`.
 * Throws if no available port is found or if the port is out of valid range.
 */
export async function findAvailablePort(
  startPort: number,
  maxAttempts: number = MAX_PORT_ATTEMPTS
): Promise<number> {
  if (startPort < MIN_PORT || startPort > MAX_PORT) {
    throw new Error(`Port ${startPort} is out of valid range (${MIN_PORT}-${MAX_PORT})`);
  }

  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (port > MAX_PORT) break;
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `No available port found between ${startPort}-${Math.min(startPort + maxAttempts - 1, MAX_PORT)}`
  );
}
