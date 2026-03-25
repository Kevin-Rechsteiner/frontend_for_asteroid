import type { ClientEvent, ServerEvent } from '../types';

type MessageHandler = (event: ServerEvent) => void;

export class WsClient {
  private socket: WebSocket | null = null;

  private messageHandler: MessageHandler | null = null;

  connect(url: string) {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.socket = new WebSocket(url);
    this.socket.addEventListener('message', (messageEvent) => {
      if (!this.messageHandler) {
        return;
      }

      try {
        const parsed = JSON.parse(String(messageEvent.data)) as ServerEvent;
        this.messageHandler(parsed);
      } catch (e) {
        console.error('WS parse error', e, messageEvent.data);
      }
    });
    this.socket.addEventListener('open', () => console.log('[WS] open'));
    this.socket.addEventListener('error', (e) => console.log('[WS] error', e));
    this.socket.addEventListener('close', (e) => console.log('[WS] close', e.code, e.reason));

  }


  onMessage(handler: MessageHandler) {
    this.messageHandler = handler;
  }

  send(event: ClientEvent) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(JSON.stringify(event));
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  get readyState() {
    return this.socket?.readyState ?? WebSocket.CLOSED;
  }


}
