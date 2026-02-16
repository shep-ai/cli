/**
 * Service Output Ports
 *
 * Interfaces for external services and integrations.
 */

export type { IExternalIssueFetcher, ExternalIssue } from './external-issue-fetcher.interface.js';
export {
  IssueFetcherError,
  IssueNotFoundError,
  IssueAuthenticationError,
  IssueServiceUnavailableError,
} from './external-issue-fetcher.interface.js';
export type {
  ISpecInitializerService,
  SpecInitializerResult,
} from './spec-initializer.interface.js';
export type { IVersionService } from './version-service.interface.js';
export type { IWebServerService } from './web-server-service.interface.js';
export type { IWorktreeService, WorktreeInfo } from './worktree-service.interface.js';
export { WorktreeError, WorktreeErrorCode } from './worktree-service.interface.js';
export type { IToolInstallerService } from './tool-installer.service.js';
