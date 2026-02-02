/**
 * @module Shep.Deployment.Deployment
 *
 * Defines the Deployment entity representing a running deployment instance.
 *
 * Deployments represent active instances of the application running in a target
 * environment. They track the deployment state, network configuration, and
 * lifecycle timestamps.
 *
 * ## Network Configuration
 *
 * Deployments use private subnets with static IPs for isolation and predictability.
 * Example URLs:
 * - http://localhost:30100/
 * - http://172.33.0.20:5173
 *
 * ## macOS Note
 *
 * On macOS, the chipmk/docker-mac-net-connect utility is required to access
 * containers via their private subnet IPs. Without this utility, only
 * localhost-mapped ports will be accessible.
 *
 * ## Usage
 *
 * Import this module to work with deployment instances:
 *
 * ```typespec
 * import "./deployment.tsp";
 *
 * op getDeployment(id: UUID): Deployment;
 * ```
 */
import "../common/scalars.tsp";
import "../common/enums/deployment.tsp";
import "./port-map.tsp";

/**
 * A running deployment instance.
 *
 * Deployment extends BaseEntity and represents an active or stopped instance
 * of the deployed application. It tracks the current state, accessible URL,
 * exposed ports, and lifecycle timestamps.
 *
 * Deployments are created when an application is deployed and remain in the
 * system even after being stopped, preserving the deployment history.
 *
 * ## Network Architecture
 *
 * Deployments use private subnets with static IPs for:
 * - Network isolation between deployments
 * - Predictable addressing for service discovery
 * - Security through network segmentation
 *
 * ## macOS Compatibility
 *
 * For macOS users, the chipmk/docker-mac-net-connect utility is required
 * to access containers via their private subnet IPs. Install with:
 * ```bash
 * brew install chipmk/tap/docker-mac-net-connect
 * sudo brew services start chipmk/tap/docker-mac-net-connect
 * ```
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "state": "Ready",
 *   "url": "http://172.33.0.20:5173",
 *   "ports": [
 *     { "name": "web", "port": 5173, "protocol": "TCP" }
 *   ],
 *   "createdAt": "2024-01-15T10:30:00Z"
 * }
 * ```
 */
@doc("A running deployment instance with network configuration and lifecycle management")
model Deployment {
  @doc("Unique identifier for the deployment instance")
  id: UUID;

  @doc("Current state of the deployment (Booting, Ready, or Stopped)")
  state: DeploymentState;

  @doc("URL where the deployment is accessible (e.g., 'http://localhost:30100/' or 'http://172.33.0.20:5173')")
  url: string;

  @doc("List of port mappings for services exposed by this deployment")
  ports: PortMap[];

  @doc("Timestamp when the deployment was created")
  @visibility("read")
  createdAt: utcDateTime;

  @doc("Timestamp when the deployment was stopped (only present when state is Stopped)")
  stoppedAt?: utcDateTime;
}
