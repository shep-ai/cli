/**
 * Web Server Service Interface
 *
 * Output port for managing the web UI server lifecycle.
 * Infrastructure layer provides concrete implementation.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides concrete implementations
 */

/**
 * Port interface for managing the web UI server.
 *
 * Implementations must:
 * - Start a web server on the specified port
 * - Support graceful shutdown
 */
export interface IWebServerService {
  /**
   * Start the web server.
   *
   * @param port - Port to listen on
   * @param dir - Path to the web package directory
   * @param dev - Whether to run in development mode
   */
  start(port: number, dir: string, dev?: boolean): Promise<void>;

  /**
   * Gracefully stop the server.
   */
  stop(): Promise<void>;
}
