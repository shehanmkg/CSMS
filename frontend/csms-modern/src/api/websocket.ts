import { toast } from 'react-toastify';

// Event types
export type WebSocketEvent =
  | 'station_update'
  | 'connector_update'
  | 'payment_update';

// Event handler type
export type WebSocketEventHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEvent, WebSocketEventHandler[]> = new Map();
  private subscriptions: Set<string> = new Set();
  private isConnected: boolean = false;

  constructor() {
    // Initialize event handlers map
    this.eventHandlers = new Map();
  }

  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Close any existing socket
    this.disconnect();

    try {
      // Determine backend URL from environment or fallback
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let host = '';

      // Use import.meta.env for Vite instead of process.env
      if (import.meta.env.VITE_API_URL) {
        host = import.meta.env.VITE_API_URL;
      } else if (window.location.host) {
        host = window.location.host;
      } else {
        // Fallback for development
        host = 'localhost:3000';
      }

      // Strip any protocol prefix if present
      if (host.startsWith('http://') || host.startsWith('https://')) {
        host = host.replace(/^https?:\/\//, '');
      }

      // Handle port if needed
      // If we're in development mode (localhost:5173), use the backend port
      if (host.includes('5173')) {
        host = host.replace('5173', '9221');
      }
      const wsUrl = `${protocol}//${host}/ws`;

      console.log(`Connecting to WebSocket at ${wsUrl}`);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }

      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnected = false;
  }

  public subscribe(stationId: string): void {
    if (!stationId) return;

    this.subscriptions.add(stationId);

    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.safelySend('subscribe', { stationId });
    }
  }

  public unsubscribe(stationId: string): void {
    if (!stationId) return;

    this.subscriptions.delete(stationId);

    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.safelySend('unsubscribe', { stationId });
    }
  }

  public on(event: WebSocketEvent, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers && !handlers.includes(handler)) {
      handlers.push(handler);
    }
  }

  public off(event: WebSocketEvent, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) return;

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private handleOpen(event: Event): void {
    console.log('WebSocket connection established');
    this.isConnected = true;

    // Re-subscribe to all stations
    this.subscriptions.forEach(stationId => {
      this.safelySend('subscribe', { stationId });
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      if (message.type && this.eventHandlers.has(message.type as WebSocketEvent)) {
        const handlers = this.eventHandlers.get(message.type as WebSocketEvent);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.data);
            } catch (err) {
              console.error(`Error in handler for ${message.type}:`, err);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
    this.isConnected = false;
    this.scheduleReconnect();
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    // Use toast in a way that won't cause issues if it's not loaded yet
    try {
      toast.error('WebSocket connection error. Attempting to reconnect...');
    } catch (e) {
      console.error('Could not show toast notification:', e);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect WebSocket...');
      try {
        this.connect();
      } catch (err) {
        console.error('WebSocket reconnection failed:', err);
      }
    }, 5000); // Reconnect after 5 seconds
  }

  // Add a method to safely send messages
  public safelySend(type: string, data: any): void {
    try {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type,
          data
        }));
      }
    } catch (err) {
      console.error('Failed to send WebSocket message:', err);
    }
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;