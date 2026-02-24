/**
 * Network status utility.
 * Tracks online/offline state with event-driven updates.
 */

type NetworkListener = (online: boolean) => void;

class NetworkStatus {
  private listeners: NetworkListener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.notify(true));
      window.addEventListener('offline', () => this.notify(false));
    }
  }

  get isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  getNetworkType(): string {
    const conn = (navigator as any).connection;
    if (conn?.type) return conn.type;
    if (conn?.effectiveType) return conn.effectiveType;
    return this.isOnline ? 'unknown' : 'none';
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(online: boolean) {
    this.listeners.forEach(l => l(online));
  }
}

export const networkStatus = new NetworkStatus();
