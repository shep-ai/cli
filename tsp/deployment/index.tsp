/**
 * @module Shep.Deployment
 *
 * Index module that re-exports all deployment-related types from the deployment layer.
 *
 * This module provides the core types for managing application deployments,
 * including deployment instances, deployment configurations (skills), and
 * port mapping value objects.
 *
 * ## Included Types
 *
 * ### Value Objects
 * - **PortMap**: Network port mapping configuration for service exposure
 * - **DevCommand**: Shell command for starting a dev environment
 *
 * ### Entities
 * - **Deployment**: A running deployment instance with state and network config
 * - **DeploySkill**: Configuration blueprint for how to deploy an application
 * - **DevEnvironmentAnalysis**: Cached result of analyzing a repo's dev environment
 *
 * ## Usage
 *
 * Import this index to access all deployment types:
 *
 * ```typespec
 * import "./deployment/index.tsp";
 *
 * op deployApplication(skill: DeploySkill): Deployment;
 * op stopDeployment(id: UUID): Deployment;
 * ```
 *
 * ## Architecture
 *
 * ```
 * DeploySkill (blueprint)
 *       |
 *       | creates
 *       v
 * Deployment (instance)
 *       |
 *       | exposes
 *       v
 * PortMap[] (network config)
 * ```
 */
import "./port-map.tsp";
import "./deployment.tsp";
import "./deploy-skill.tsp";
import "./dev-command.tsp";
import "./dev-environment-analysis.tsp";
