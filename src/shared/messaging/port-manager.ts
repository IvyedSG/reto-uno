/**
 * Port Manager - Chrome Extension Port Communication
 * 
 * Provides a typed wrapper for chrome.runtime.Port to facilitate
 * bidirectional communication between popup and background scripts.
 */

import { Action, PortMessage, PortName } from '../types/message.types';

export class PortManager {
  private port: chrome.runtime.Port | null = null;

  /**
   * Conecta a un puerto específico por nombre.
   */
  connect(name: PortName): chrome.runtime.Port {
    this.port = chrome.runtime.connect({ name });
    console.log(`[PortManager] Conectado al puerto: ${name}`);
    return this.port;
  }

  /**
   * Establece un puerto existente (usado en listeners de onConnect).
   */
  setPort(port: chrome.runtime.Port) {
    this.port = port;
  }

  /**
   * Envía un mensaje tipado a través del puerto.
   */
  postMessage(type: Action, payload: any) {
    if (!this.port) {
      console.warn('[PortManager] Intentando enviar mensaje sin puerto activo');
      return;
    }
    
    const message: PortMessage = { type, payload };
    this.port.postMessage(message);
  }

  /**
   * Escucha mensajes del puerto.
   */
  onMessage(callback: (message: PortMessage) => void) {
    if (!this.port) return;
    
    const listener = (msg: any) => {
      callback(msg as PortMessage);
    };
    
    this.port.onMessage.addListener(listener);
    return () => this.port?.onMessage.removeListener(listener);
  }

  /**
   * Escucha cuando el puerto se desconecta.
   */
  onDisconnect(callback: () => void) {
    this.port?.onDisconnect.addListener(callback);
  }

  /**
   * Desconecta el puerto manualmente.
   */
  disconnect() {
    this.port?.disconnect();
    this.port = null;
  }

  /**
   * Verifica si hay una conexión activa.
   */
  isConnected(): boolean {
    return this.port !== null;
  }
}
