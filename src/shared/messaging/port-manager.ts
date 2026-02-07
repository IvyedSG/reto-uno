import { Action, PortMessage, PortName } from '@/shared/types/message.types';

export class PortManager {
  private port: chrome.runtime.Port | null = null;

  connect(name: PortName): chrome.runtime.Port {
    this.port = chrome.runtime.connect({ name });
    console.log(`[PortManager] Conectado al puerto: ${name}`);
    return this.port;
  }

  setPort(port: chrome.runtime.Port) {
    this.port = port;
  }

  postMessage(type: Action, payload: any) {
    if (!this.port) {
      console.warn('[PortManager] No hay puerto activo para enviar:', type);
      return;
    }
    
    try {
      const message: PortMessage = { type, payload };
      this.port.postMessage(message);
    } catch (error) {
      console.error('[PortManager] Error al enviar mensaje (posible puerto desconectado):', error);
      this.port = null;
    }
  }

  onMessage(callback: (message: PortMessage) => void) {
    if (!this.port) return;
    
    const listener = (msg: any) => {
      callback(msg as PortMessage);
    };
    
    this.port.onMessage.addListener(listener);
    return () => this.port?.onMessage.removeListener(listener);
  }

  onDisconnect(callback: () => void) {
    this.port?.onDisconnect.addListener(callback);
  }

  disconnect() {
    this.port?.disconnect();
    this.port = null;
  }

  isConnected(): boolean {
    return this.port !== null;
  }
}
