/**
 * Messaging Service
 *
 * Core orchestrator for the external messaging remote control feature.
 * Implements IMessagingService and coordinates:
 * - Tunnel connection to the Commands.com Gateway
 * - Command execution (inbound commands → use cases)
 * - Notification emission (lifecycle events → tunnel → phone)
 * - Chat relay (bidirectional agent ↔ messaging)
 *
 * Lifecycle:
 * 1. isConfigured() checks if Gateway URL and platform credentials exist
 * 2. start() connects to the Gateway tunnel and wires up handlers
 * 3. stop() disconnects and cleans up all resources
 */

import type { IMessagingService } from '../../../application/ports/output/services/messaging-service.interface.js';
import type {
  MessagingNotification,
  MessagingCommand,
  MessagingConfig,
} from '../../../domain/generated/output.js';
import { MessagingTunnelAdapter } from './messaging-tunnel.adapter.js';
import { MessagingCommandExecutor } from './command-executor.js';
import { MessagingNotificationEmitter } from './notification-emitter.js';
import { MessagingChatRelay } from './chat-relay.js';
import type { NotificationBus } from '../notifications/notification-bus.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
import type { ListFeaturesUseCase } from '../../../application/use-cases/features/list-features.use-case.js';
import type { ShowFeatureUseCase } from '../../../application/use-cases/features/show-feature.use-case.js';
import type { CreateFeatureUseCase } from '../../../application/use-cases/features/create/create-feature.use-case.js';
import type { ApproveAgentRunUseCase } from '../../../application/use-cases/agents/approve-agent-run.use-case.js';
import type { RejectAgentRunUseCase } from '../../../application/use-cases/agents/reject-agent-run.use-case.js';
import type { StopAgentRunUseCase } from '../../../application/use-cases/agents/stop-agent-run.use-case.js';
import type { ResumeFeatureUseCase } from '../../../application/use-cases/features/resume-feature.use-case.js';
import type { ListRepositoriesUseCase } from '../../../application/use-cases/repositories/list-repositories.use-case.js';

interface MessagingServiceDeps {
  config: MessagingConfig;
  authToken: string;
  notificationBus: NotificationBus;
  featureRepo: IFeatureRepository;
  createFeature: CreateFeatureUseCase;
  approveAgentRun: ApproveAgentRunUseCase;
  rejectAgentRun: RejectAgentRunUseCase;
  stopAgentRun: StopAgentRunUseCase;
  resumeFeature: ResumeFeatureUseCase;
  listFeatures: ListFeaturesUseCase;
  showFeature: ShowFeatureUseCase;
  listRepositories: ListRepositoriesUseCase;
}

export class MessagingService implements IMessagingService {
  private tunnelAdapter: MessagingTunnelAdapter | null = null;
  private commandExecutor: MessagingCommandExecutor | null = null;
  private notificationEmitter: MessagingNotificationEmitter | null = null;
  private chatRelay: MessagingChatRelay | null = null;
  private started = false;

  constructor(private readonly deps: MessagingServiceDeps) {}

  isConfigured(): boolean {
    const { config } = this.deps;
    if (!config.enabled || !config.gatewayUrl) return false;

    const hasTelegram = config.telegram?.enabled && config.telegram.paired;
    const hasWhatsApp = config.whatsapp?.enabled && config.whatsapp.paired;
    return !!(hasTelegram ?? hasWhatsApp);
  }

  isConnected(): boolean {
    return this.tunnelAdapter?.isConnected() ?? false;
  }

  async start(): Promise<void> {
    if (this.started || !this.isConfigured()) return;

    const { config, authToken, notificationBus, featureRepo } = this.deps;

    // Create tunnel adapter
    this.tunnelAdapter = new MessagingTunnelAdapter(config.gatewayUrl!, authToken);

    // Create command executor
    this.commandExecutor = new MessagingCommandExecutor(
      featureRepo,
      this.deps.createFeature,
      this.deps.approveAgentRun,
      this.deps.rejectAgentRun,
      this.deps.stopAgentRun,
      this.deps.resumeFeature,
      this.deps.listFeatures,
      this.deps.showFeature,
      this.deps.listRepositories
    );

    // Create notification emitter
    this.notificationEmitter = new MessagingNotificationEmitter(
      this.tunnelAdapter,
      notificationBus,
      config.debounceMs ?? 5_000
    );

    // Create chat relay
    this.chatRelay = new MessagingChatRelay(this.tunnelAdapter, config.chatBufferMs ?? 3_000);

    // Wire up command handling
    this.tunnelAdapter.onCommand(async (cmd: MessagingCommand) => {
      // Handle chat control commands
      if (cmd.type === 'chat_control') {
        return this.handleChatControl(cmd);
      }

      // Handle chat messages (relay to active session)
      if (cmd.type === 'chat_message' && this.chatRelay?.hasActiveRelay()) {
        // In a full implementation, this would relay to the interactive session.
        // For now, we acknowledge receipt.
        return 'Message received (chat relay processing).';
      }

      // Handle regular commands
      return this.commandExecutor!.execute(cmd);
    });

    // Connect to the Gateway
    try {
      await this.tunnelAdapter.connect();
    } catch {
      // Connection failure is non-fatal — reconnection is automatic
    }

    // Start notification forwarding
    this.notificationEmitter.start();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    this.notificationEmitter?.stop();
    this.chatRelay?.stop();
    await this.tunnelAdapter?.disconnect();

    this.tunnelAdapter = null;
    this.commandExecutor = null;
    this.notificationEmitter = null;
    this.chatRelay = null;
    this.started = false;
  }

  async sendNotification(notification: MessagingNotification): Promise<void> {
    this.tunnelAdapter?.sendNotification(notification);
  }

  private handleChatControl(cmd: MessagingCommand): string {
    if (!this.chatRelay) return 'Chat relay not available.';

    if (cmd.command === 'new' && cmd.featureId) {
      // /chat <feature_id> → start relay
      return this.chatRelay.startRelay(cmd.featureId, cmd.chatId, cmd.platform);
    }

    // /end → stop relay
    return this.chatRelay.endRelay();
  }
}
