/**
 * @module Shep.Deployment.PortMap
 *
 * Defines the PortMap value object for mapping service names to network ports.
 *
 * Port mappings are used to configure how containerized services expose their
 * network endpoints. Each mapping associates a human-readable service name
 * with a port number and optional protocol specification.
 *
 * ## Usage
 *
 * Import this module to use PortMap in deployment configurations:
 *
 * ```typespec
 * import "./port-map.tsp";
 *
 * model Deployment {
 *   ports: PortMap[];
 * }
 * ```
 *
 * ## Design Notes
 *
 * PortMap is a value object, NOT an entity. It does not extend BaseEntity
 * and has no independent identity. It is embedded within Deployment and
 * DeploySkill entities.
 */
import "../common/enums/deployment.tsp";

/**
 * Port mapping configuration for exposing container services.
 *
 * PortMap defines the network configuration for a single service endpoint,
 * mapping a logical service name to a specific port number. The optional
 * protocol field defaults to TCP when not specified.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and is embedded within parent entities.
 *
 * @example
 * ```json
 * {
 *   "name": "web",
 *   "port": 3000,
 *   "protocol": "TCP"
 * }
 * ```
 *
 * @example
 * ```json
 * {
 *   "name": "api",
 *   "port": 8080
 * }
 * ```
 */
@doc("Port mapping configuration for exposing container services to the network")
model PortMap {
  @doc("Service name identifier (e.g., 'web', 'api', 'db', 'redis')")
  name: string;

  @doc("Port number to expose on the host or container network")
  port: int32;

  @doc("Network protocol for the port (defaults to TCP if not specified)")
  protocol?: PortProtocol;
}
