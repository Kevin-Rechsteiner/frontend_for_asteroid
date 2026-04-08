import type { ClientEvent, ServerEvent } from '../types';

type MessageHandler = (event: ServerEvent) => void;

export class WsClient {
  private socket: WebSocket | null = null;
  private messageHandler: MessageHandler | null = null;
  private pendingMessages: ClientEvent[] = [];

  connect(url: string) {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.addEventListener('open', () => {
      this.flushPendingMessages();
    });

    this.socket.addEventListener('message', (messageEvent) => {
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
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  send(event: ClientEvent) {
    if (!this.socket) {
      this.pendingMessages.push(event);
      return;
    }

    if (this.socket.readyState !== WebSocket.OPEN) {
      // Queue the message until connection is open
      this.pendingMessages.push(event);
      return;
    }

    this.socket.send(JSON.stringify(event));
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
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.pendingMessages = [];
  }

  get readyState() {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }
}
