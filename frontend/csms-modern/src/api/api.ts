// API Service for CSMS
// This service handles all API communication with the backend

import axios from 'axios';
import { toast } from 'react-toastify';
import websocketService from './websocket';

// Types
export interface Connector {
  id: string;
  status: string;
  power: number;
  type: string;
  currentSession?: string;
  meterValue?: {
    value: number;
    unit: string;
    timestamp?: string;
  };
}

export interface ChargingStation {
  id: string;
  name: string;
  location?: string;
  description?: string;
  status?: string;
  lastHeartbeat?: string;
  vendor?: string;
  model?: string;
  chargePointVendor?: string;
  chargePointModel?: string;
  connectors: { [id: string]: Connector } | Connector[];
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  stationId: string;
  connectorId: string;
  startTime: string;
  endTime?: string;
  meterStart: number;
  meterStop?: number;
  consumedEnergy?: number;
  amount?: number;
  status: string;
  idTag?: string;
}

export interface PaymentDetails {
  stationId: string;
  connectorId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  sessionId?: string;
}

// Dashboard statistics
export interface DashboardStats {
  totalStations: number;
  activeStations: number;
  totalTransactions: number;
  activeTransactions: number;
  totalEnergyDelivered: number;
  averageSessionDuration: number;
}

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Use axios for API requests
const API_URL = '/api';
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Handle axios errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      throw new ApiError(`API error: ${error.response.statusText}`, error.response.status);
    } else if (error.request) {
      throw new ApiError('Network error: No response received', 0);
    } else {
      throw new ApiError(`Error: ${error.message}`, 0);
    }
  }
);

// Sample data for fallback
const sampleStations: ChargingStation[] = [
  {
    id: 'CS001',
    vendor: 'ABB',
    model: 'Terra 54',
    status: 'Available',
    lastHeartbeat: new Date().toISOString(),
    connectors: [
      { id: '1', status: 'Available', power: 22, type: 'Type 2' },
      { id: '2', status: 'Available', power: 50, type: 'CCS' }
    ],
    firmwareVersion: '1.5.2',
    updateAvailable: false
  },
  {
    id: 'CS002',
    vendor: 'ChargePoint',
    model: 'CT4000',
    status: 'Charging',
    lastHeartbeat: new Date().toISOString(),
    connectors: [
      { id: '1', status: 'Charging', power: 7, type: 'Type 2', currentSession: '15.7 kWh' },
      { id: '2', status: 'Available', power: 7, type: 'Type 2' }
    ],
    firmwareVersion: '2.1.0',
    updateAvailable: true
  },
  {
    id: 'CS003',
    vendor: 'Tesla',
    model: 'Wall Connector',
    status: 'Faulted',
    lastHeartbeat: new Date(Date.now() - 3600000).toISOString(),
    connectors: [
      { id: '1', status: 'Faulted', power: 11, type: 'Type 2' }
    ],
    firmwareVersion: '3.2.1',
    updateAvailable: false
  }
];

const sampleTransactions: Transaction[] = [
  {
    id: 'TX001',
    stationId: 'CS001',
    userId: 'user123',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    endTime: new Date(Date.now() - 5400000).toISOString(),
    status: 'Completed',
    energy: 25.3,
    cost: 12.65
  },
  {
    id: 'TX002',
    stationId: 'CS002',
    userId: 'user456',
    startTime: new Date(Date.now() - 3600000).toISOString(),
    endTime: '',
    status: 'In Progress',
    energy: 15.7,
    cost: 7.85
  }
];

// API Modules
export const stationsApi = {
  async getAll(): Promise<ChargingStation[]> {
    try {
      const response = await api.get('/stations');
      return response.data.stations || [];
    } catch (error) {
      console.warn('Failed to fetch stations from API, using sample data', error);
      return sampleStations;
    }
  },
  
  async getById(id: string): Promise<ChargingStation> {
    try {
      const response = await api.get(`/stations/${id}`);
      const stationData = response.data.station;
      
      // Normalize connectors for consistent handling
      if (stationData.connectors) {
        if (!Array.isArray(stationData.connectors) && typeof stationData.connectors === 'object') {
          // Convert object-based connectors to array format
          stationData.connectors = Object.entries(stationData.connectors).map(
            ([connectorId, data]) => ({
              id: connectorId,
              ...(data as any)
            })
          );
        }
      } else {
        stationData.connectors = [];
      }
      
      return {
        ...stationData,
        vendor: stationData.vendor || stationData.chargePointVendor || 'Unknown',
        model: stationData.model || stationData.chargePointModel || 'Unknown'
      };
    } catch (error) {
      console.warn(`Failed to fetch station ${id} from API, using sample data`, error);
      // For demo purposes, return a sample station when API fails
      const station = sampleStations.find(s => s.id === id);
      if (!station) throw new Error(`Station ${id} not found`);
      return station;
    }
  },
  
  updateStatus: async (id: string, status: string): Promise<void> => {
    try {
      await api.put(`/stations/${id}/status`, { status });
    } catch (error) {
      console.warn(`Mock station status update for ${id}: ${status}`, error);
    }
  }
};

export const transactionsApi = {
  async getAll(): Promise<Transaction[]> {
    try {
      const response = await api.get('/transactions');
      return response.data.transactions || [];
    } catch (error) {
      console.warn('Failed to fetch transactions from API, using sample data', error);
      return sampleTransactions;
    }
  },
  
  async getByStationId(stationId: string): Promise<Transaction[]> {
    try {
      const response = await api.get(`/stations/${stationId}/transactions`);
      return response.data.transactions || [];
    } catch (error) {
      console.warn(`Failed to fetch transactions for station ${stationId} from API, using sample data`, error);
      return sampleTransactions.filter(t => t.stationId === stationId);
    }
  }
};

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.warn('Failed to fetch dashboard stats from API, computing from sample data', error);
      
      // Compute stats from sample data
      const activeStations = sampleStations.filter(s => s.status === 'Available' || s.status === 'Charging').length;
      const totalStations = sampleStations.length;
      const activeTransactions = sampleTransactions.filter(t => !t.endTime).length;
      
      const totalEnergyDelivered = sampleTransactions.reduce((sum, tx) => sum + tx.energy, 0);
      
      return {
        activeStations,
        totalStations,
        activeTransactions,
        totalEnergyDelivered,
        totalTransactions: sampleTransactions.length,
        averageSessionDuration: 45 // minutes
      };
    }
  },
  
  async getEnergyUsageByDay(): Promise<any[]> {
    try {
      const response = await api.get('/dashboard/energy');
      return response.data.energyData || [];
    } catch (error) {
      console.warn('Failed to fetch energy usage data from API, using sample data', error);
      
      // Generate 7 days of sample data
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return days.map(day => ({
        day,
        value: Math.floor(Math.random() * 100) + 50
      }));
    }
  },
  
  async getUtilizationByHour(): Promise<any[]> {
    try {
      const response = await api.get('/dashboard/utilization');
      return response.data.utilizationData || [];
    } catch (error) {
      console.warn('Failed to fetch utilization data from API, using sample data', error);
      
      // Generate hourly utilization data
      return Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        value: Math.floor(Math.random() * 70) + 10
      }));
    }
  },
  
  async getStatusDistribution(): Promise<any[]> {
    try {
      const response = await api.get('/dashboard/status');
      return response.data.statusData || [];
    } catch (error) {
      console.warn('Failed to fetch status distribution from API, using sample data', error);
      
      return [
        { status: 'Available', count: 7 },
        { status: 'Charging', count: 5 },
        { status: 'Faulted', count: 2 },
        { status: 'Unavailable', count: 1 }
      ];
    }
  }
};

// Add proper definition for the processPayment function that's called in paymentApi
/**
 * Process payment for charging
 */
const processPayment = async (paymentId: string): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const response = await api.post('/payment/complete', { paymentId });
    
    // Log successful response
    console.log('Payment processing successful:', response.data);
    
    return {
      success: true,
      message: 'Payment processed successfully',
      data: response.data
    };
  } catch (error: any) {
    // Log detailed error information
    console.error('Payment processing failed:', error);
    
    // Get error details from the response if available
    const errorMessage = error.response?.data?.message || 
                         error.message || 
                         'Unknown error occurred during payment';
    
    return {
      success: false,
      message: errorMessage
    };
  }
};

export const paymentApi = {
  processPayment: async (stationId: string, connectorId: string): Promise<{ success: boolean; message: string; transactionId?: string }> => {
    try {
      // Generate a payment ID with the format payment_stationId_connectorId_timestamp
      const paymentId = `payment_${stationId}_${connectorId}_${Date.now()}`;
      
      // Process the payment
      const response = await processPayment(paymentId);
      
      return {
        success: response.success,
        message: response.message,
        transactionId: response.data?.transactionId
      };
    } catch (error: any) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        message: error.message || 'Payment processing failed'
      };
    }
  }
};

// WebSocket singleton for real-time updates
class WebSocketManager {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private connecting = false;

  constructor() {
    // Initialize any needed properties
  }

  public connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN || this.connecting) return;
    
    this.connecting = true;
    
    // Determine correct WebSocket URL based on current window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsURL = `${protocol}//${host.replace('5173', '9220')}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsURL}`);
    
    try {
      this.socket = new WebSocket(wsURL);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.reconnectAttempts = 0;
        this.connecting = false;
        this.emit('connection', { status: 'connected' });
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.type && data.payload) {
            this.emit(data.type, data.payload);
          } else {
            // If no type is specified, emit as general update
            this.emit('update', data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed', event.code, event.reason);
        this.connecting = false;
        this.emit('connection', { status: 'disconnected' });
        
        // Attempt to reconnect if not explicitly closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connecting = false;
        this.emit('connection', { status: 'error', error });
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.connecting = false;
    }
  }

  public disconnect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close(1000, 'Client disconnected');
    }
  }

  public on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  public off(event: string, callback: Function): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)?.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
        }
      });
    }
  }

  public send(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  }

  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Export the WebSocket manager
export const websocketManager = new WebSocketManager();

// Connection manager for optimized polling
class ConnectionManager {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  // Default polling intervals in ms
  private defaultIntervals = {
    stations: 5000,       // 5 seconds for stations
    transactions: 10000,  // 10 seconds for transactions
    default: 5000         // 5 seconds default
  };

  // Start polling for a resource
  startPolling(resourceKey: string, callback: () => void): void {
    // Stop any existing interval for this resource
    this.stopPolling(resourceKey);
    
    // Determine appropriate interval
    let interval = this.defaultIntervals.default;
    if (resourceKey === 'stations') {
      interval = this.defaultIntervals.stations;
    } else if (resourceKey === 'transactions' || resourceKey.startsWith('transactions_')) {
      interval = this.defaultIntervals.transactions;
    } else if (resourceKey.startsWith('station_')) {
      interval = this.defaultIntervals.stations;
    }
    
    // If the resource is a station, also subscribe to WebSocket updates for it
    if (resourceKey.startsWith('station_')) {
      const stationId = resourceKey.replace('station_', '');
      if (stationId) {
        websocketService.subscribe(stationId);
      }
    }
    
    // Start the interval
    const intervalId = setInterval(callback, interval);
    this.pollingIntervals.set(resourceKey, intervalId);
  }

  // Stop polling for a resource
  stopPolling(resourceKey: string): void {
    const interval = this.pollingIntervals.get(resourceKey);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(resourceKey);
      
      // If the resource is a station, also unsubscribe from WebSocket updates
      if (resourceKey.startsWith('station_')) {
        const stationId = resourceKey.replace('station_', '');
        if (stationId) {
          websocketService.unsubscribe(stationId);
        }
      }
    }
  }

  // Check if polling is active for a resource
  isPolling(resourceKey: string): boolean {
    return this.pollingIntervals.has(resourceKey);
  }
}

// Export the connection manager
export const connectionManager = new ConnectionManager();

// Export api instance for direct use in components if needed
export default api; 