import type { ClientEvent, ServerEvent } from '../types';

type MessageHandler = (event: ServerEvent) => void;

export class WsClient {
  private socket: WebSocket | null = null;
  private messageHandler: MessageHandler | null = null;
  private pendingMessages: ClientEvent[] = [];
  private reconnectTimer: number | null = null;
  private shouldReconnect = false;
  private url: string | null = null;
  private activeSocketId = 0;

  private static readonly RECONNECT_DELAY_MS = 1000;

  connect(url: string) {
    this.url = url;
    this.shouldReconnect = true;

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.openSocket(url);
  }

  private openSocket(url: string) {
    const socket = new WebSocket(url);
    const socketId = ++this.activeSocketId;
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (!this.isCurrentSocket(socketId, socket)) {
        return;
      }

      this.flushPendingMessages();
    });

    socket.addEventListener('message', (messageEvent) => {
      if (!this.isCurrentSocket(socketId, socket)) {
        return;
      }

      if (!this.messageHandler) {
        return;
      }

      try {
        const parsed = JSON.parse(String(messageEvent.data)) as ServerEvent;
        this.messageHandler(parsed);
      } catch {
        // JSON parse error
      }
    });

    socket.addEventListener('close', () => {
      if (!this.isCurrentSocket(socketId, socket)) {
        return;
      }

      this.socket = null;
      this.scheduleReconnect();
    });
  }

  private isCurrentSocket(socketId: number, socket: WebSocket) {
    return this.activeSocketId === socketId && this.socket === socket;
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer !== null || !this.url) {
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect && this.url) {
        this.openSocket(this.url);
      }
    }, WsClient.RECONNECT_DELAY_MS);
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  send(event: ClientEvent) {
    if (!this.socket) {
      this.enqueuePendingMessage(event);
      return;
    }

    if (this.socket.readyState !== WebSocket.OPEN) {
      // Queue the message until connection is open
      this.enqueuePendingMessage(event);
      return;
    }

    this.socket.send(JSON.stringify(event));
  }

  private enqueuePendingMessage(event: ClientEvent) {
    // Keep only the newest player_input while offline to avoid huge stale queues.
    if (event.type === 'player_input') {
      this.pendingMessages = this.pendingMessages.filter((pendingEvent) => pendingEvent.type !== 'player_input');
    }

    this.pendingMessages.push(event);
  }

  private flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const event = this.pendingMessages.shift();
      if (event && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(event));
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.activeSocketId += 1;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.url = null;
    this.pendingMessages = [];
  }

  get readyState() {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }
}
