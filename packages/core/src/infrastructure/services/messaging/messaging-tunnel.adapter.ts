/**
 * Messaging Tunnel Adapter
 *
 * Manages the WebSocket tunnel connection to the Commands.com Gateway
 * for bidirectional messaging between Shep and external platforms
 * (Telegram, WhatsApp).
 *
 * Uses Node.js built-in WebSocket API (available since Node 21).
 * Auth token is passed as a URL query parameter since the browser-compatible
 * WebSocket API does not support custom headers.
 *
 * Tunnel frame types:
 * - tunnel.messaging.outbound: Shep → Gateway (notifications, command responses, chat responses)
 * - tunnel.messaging.inbound:  Gateway → Shep (commands, chat messages)
 */

import type { MessagingNotification, MessagingCommand } from '../../../domain/generated/output.js';

const RECONNECT_DELAY_MS = 5_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

type CommandHandler = (cmd: MessagingCommand) => Promise<string>;

interface TunnelFrame {
  type: string;
  request_id?: string;
  payload: string;
}

/**
 * Manages the WebSocket tunnel to the Commands.com Gateway for messaging.
 * Handles connection lifecycle, heartbeats, reconnection, and frame routing.
 */
export class MessagingTunnelAdapter {
  private ws: WebSocket | null = null;
  private commandHandler: CommandHandler | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private stopping = false;

  constructor(
    private readonly gatewayUrl: string,
    private readonly authToken: string
  ) {}

  /** Register a handler for inbound commands from the Gateway */
  onCommand(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  /** Connect to the Gateway tunnel WebSocket */
  async connect(): Promise<void> {
    if (this.connected || this.stopping) return;

    return new Promise<void>((resolve, reject) => {
      const baseUrl = this.gatewayUrl.replace(/^http/, 'ws');
      const tunnelUrl = `${baseUrl}/gateway/v1/integrations/tunnel/connect?token=${encodeURIComponent(this.authToken)}`;

      this.ws = new WebSocket(tunnelUrl);

      this.ws.addEventListener('open', () => {
        this.connected = true;
        this.startHeartbeat();
        resolve();
      });

      this.ws.addEventListener('message', (event: MessageEvent) => {
        const data = typeof event.data === 'string' ? event.data : String(event.data);
        this.handleFrame(data).catch(() => {
          // Frame handling errors are non-fatal — silently drop malformed frames
        });
      });

      this.ws.addEventListener('close', () => {
        this.connected = false;
        this.stopHeartbeat();
        if (!this.stopping) {
          this.scheduleReconnect();
        }
      });

      this.ws.addEventListener('error', () => {
        if (!this.connected) {
          reject(new Error('WebSocket connection to Gateway failed'));
        }
      });
    });
  }

  /** Disconnect from the Gateway tunnel */
  async disconnect(): Promise<void> {
    this.stopping = true;
    this.stopHeartbeat();
    this.clearReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
  }

  /** Send a notification or chat response to the Gateway for delivery */
  sendNotification(notification: MessagingNotification): void {
    this.sendFrame({
      type: 'tunnel.messaging.outbound',
      payload: JSON.stringify(notification),
    });
  }

  /** Check if the tunnel is currently connected */
  isConnected(): boolean {
    return this.connected;
  }

  private async handleFrame(data: string): Promise<void> {
    const frame: TunnelFrame = JSON.parse(data);

    if (frame.type === 'tunnel.messaging.inbound' && this.commandHandler) {
      const cmd: MessagingCommand = JSON.parse(frame.payload);
      const response = await this.commandHandler(cmd);

      // Send response back through tunnel
      this.sendNotification({
        event: 'command.response',
        featureId: cmd.featureId ?? '',
        title: '',
        message: response,
      });
    }
  }

  private sendFrame(frame: TunnelFrame): void {
    if (!this.ws || !this.connected) return;
    this.ws.send(JSON.stringify(frame));
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendFrame({ type: 'tunnel.heartbeat', payload: '' });
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimer.unref();
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnect failed, will retry via close event
      });
    }, RECONNECT_DELAY_MS);
    this.reconnectTimer.unref();
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
