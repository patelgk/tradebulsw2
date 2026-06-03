type DhanConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

class BrowserDhanService {
  onPriceUpdate?: (symbol: string, price: number) => void;
  onStatusChange?: (status: DhanConnectionStatus) => void;

  isConfigured() {
    return Boolean(process.env.DHAN_CLIENT_ID && process.env.DHAN_ACCESS_TOKEN);
  }

  connect() {
    this.onStatusChange?.('disconnected');
  }

  disconnect() {
    this.onStatusChange?.('disconnected');
  }
}

export const dhanService = new BrowserDhanService();
