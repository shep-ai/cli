/**
 * @module Shep.Common.Enums.Deployment
 *
 * Defines enums for deployment-related entities in the Shep AI platform,
 * including deployment states, methods, network protocols, and analysis sources.
 */
/**
 * Deployment State Transition Flow:
 * ```
 * Booting --> Ready --> Stopped
 *    ^          |          |
 *    |          v          |
 *    +----------+----------+
 *        (restart cycle)
 * ```
 */
@doc("States for deployment instances")
enum DeploymentState {
  /**
   * Deployment is starting up - containers are being created,
   * services are initializing, and health checks are pending.
   */
  @doc("Deployment is starting up and initializing")
  Booting,

  /**
   * Deployment is fully operational - all services are running,
   * health checks are passing, and the system is accepting traffic.
   */
  @doc("Deployment is fully operational and accepting traffic")
  Ready,

  /**
   * Deployment has been stopped - services are shut down,
   * containers are stopped, but configuration is preserved.
   */
  @doc("Deployment has been stopped")
  Stopped,

  /**
   * Repository analysis determined that there is nothing startable -
   * the repo is a library, CLI tool, or utility with no server/UI.
   * No process is spawned in this state.
   */
  @doc("Repository has no startable server or UI")
  NotStartable,
}

/**
 * Specifies the method used to deploy the application.
 * Determines the deployment tooling and infrastructure requirements.
 */
@doc("Methods for deploying applications")
enum DeployMethod {
  /**
   * Docker Compose - multi-container orchestration using
   * docker-compose.yml configuration files.
   */
  @doc("Multi-container deployment using Docker Compose")
  DockerCompose,

  /**
   * Single Docker container deployment without orchestration.
   */
  @doc("Single container deployment using Docker")
  Docker,

  /**
   * Kubernetes deployment using manifests, Helm charts,
   * or other Kubernetes-native tooling.
   */
  @doc("Kubernetes-native deployment with manifests or Helm")
  Kubernetes,

  /**
   * Custom script-based deployment using shell scripts
   * or other automation tools.
   */
  @doc("Custom script-based deployment automation")
  Script,

  /**
   * Manual deployment requiring human intervention
   * for each deployment step.
   */
  @doc("Manual deployment requiring human intervention")
  Manual,
}

/**
 * Network transport protocols for port mappings.
 */
@doc("Network transport protocols for port configuration")
enum PortProtocol {
  /**
   * Transmission Control Protocol - connection-oriented,
   * reliable delivery for most application traffic.
   */
  @doc("TCP protocol for reliable connection-oriented traffic")
  TCP,

  /**
   * User Datagram Protocol - connectionless, best-effort
   * delivery for streaming and real-time applications.
   */
  @doc("UDP protocol for connectionless best-effort delivery")
  UDP,
}

/**
 * Source of a dev environment analysis result.
 * Indicates how the analysis was produced, which affects
 * cache behavior and UI display.
 */
@doc("Source of a dev environment analysis result")
enum AnalysisSource {
  /**
   * Analysis was produced by the fast-path deterministic detection
   * (e.g., package.json script scanning).
   */
  @doc("Deterministic fast-path detection (e.g., package.json scripts)")
  FastPath,

  /**
   * Analysis was produced by the AI agent via StructuredAgentCaller.
   */
  @doc("AI agent analysis via StructuredAgentCaller")
  Agent,

  /**
   * Analysis was manually edited by the user.
   */
  @doc("Manually edited by the user")
  Manual,
}
