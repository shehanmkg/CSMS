// API Service for CSMS
// This service handles all API communication with the backend

import axios from 'axios';

// Station types
export interface ChargingStation {
  id: string;
  model: string;
  vendor: string;
  serialNumber: string;
  firmwareVersion: string;
  connectors: Connector[];
  status: string;
  lastHeartbeat: string;
  networkStatus: string;
  errorCode?: string;
}

export interface Connector {
  id: number;
  status: string;
  availability: string;
  type: string;
  power: number;
}

// Transaction types
export interface Transaction {
  transactionId: string;
  chargePointId: string;
  connectorId: number;
  idTag: string;
  startTimestamp: string;
  stopTimestamp?: string;
  meterStart: number;
  meterStop?: number;
  energyUsed?: number;
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
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
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
    id: 'CP01',
    model: 'PowerCharger',
    vendor: 'ChargeTech',
    serialNumber: 'SN12345',
    firmwareVersion: '2.3.1',
    connectors: [
      { id: 1, status: 'Available', availability: 'Operative', type: 'Type 2', power: 22 },
      { id: 2, status: 'Charging', availability: 'Operative', type: 'CCS', power: 50 }
    ],
    status: 'Available',
    lastHeartbeat: new Date().toISOString(),
    networkStatus: 'Connected'
  },
  {
    id: 'CP02',
    model: 'RapidCharger',
    vendor: 'EVTech',
    serialNumber: 'SN67890',
    firmwareVersion: '1.8.5',
    connectors: [
      { id: 1, status: 'Charging', availability: 'Operative', type: 'Type 2', power: 22 }
    ],
    status: 'Charging',
    lastHeartbeat: new Date().toISOString(),
    networkStatus: 'Connected'
  },
  {
    id: 'CP03',
    model: 'SuperCharger',
    vendor: 'PowerCo',
    serialNumber: 'SN54321',
    firmwareVersion: '3.0.1',
    connectors: [
      { id: 1, status: 'Available', availability: 'Operative', type: 'Type 2', power: 11 },
      { id: 2, status: 'Available', availability: 'Operative', type: 'CCS', power: 50 }
    ],
    status: 'Available',
    lastHeartbeat: new Date().toISOString(),
    networkStatus: 'Connected'
  }
];

const sampleTransactions: Transaction[] = [
  {
    transactionId: 'TX001',
    chargePointId: 'CP01',
    connectorId: 2,
    idTag: 'RFID1234',
    startTimestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    meterStart: 1000,
    energyUsed: 12500
  },
  {
    transactionId: 'TX002',
    chargePointId: 'CP02',
    connectorId: 1,
    idTag: 'RFID5678',
    startTimestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    meterStart: 2000,
    energyUsed: 8000
  },
  {
    transactionId: 'TX003',
    chargePointId: 'CP03',
    connectorId: 1,
    idTag: 'RFID9012',
    startTimestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    stopTimestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    meterStart: 3000,
    meterStop: 18000,
    energyUsed: 15000
  }
];

// API modules with fallback to sample data for missing endpoints
export const stationsApi = {
  getAll: async (): Promise<ChargingStation[]> => {
    try {
      const response = await api.get('/stations');
      return response.data.stations || [];
    } catch (error) {
      console.warn('Falling back to sample stations data', error);
      return sampleStations;
    }
  },
  
  getById: async (id: string): Promise<ChargingStation> => {
    try {
      const response = await api.get(`/stations/${id}`);
      return response.data.station;
    } catch (error) {
      console.warn(`Falling back to sample station data for ${id}`, error);
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
  getAll: async (): Promise<Transaction[]> => {
    try {
      const response = await api.get('/transactions');
      return response.data.transactions || [];
    } catch (error) {
      console.warn('Falling back to sample transactions data', error);
      return sampleTransactions;
    }
  },
  
  getById: async (id: string): Promise<Transaction> => {
    try {
      const response = await api.get(`/transactions/${id}`);
      return response.data.transaction;
    } catch (error) {
      console.warn(`Falling back to sample transaction data for ${id}`, error);
      const transaction = sampleTransactions.find(t => t.transactionId === id);
      if (!transaction) throw new Error(`Transaction ${id} not found`);
      return transaction;
    }
  },
  
  getByStationId: async (stationId: string): Promise<Transaction[]> => {
    try {
      const response = await api.get(`/stations/${stationId}/transactions`);
      return response.data.transactions || [];
    } catch (error) {
      console.warn(`Falling back to sample transactions for station ${stationId}`, error);
      return sampleTransactions.filter(t => t.chargePointId === stationId);
    }
  }
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      // Try to get stats from API
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.warn('Falling back to computed dashboard stats', error);
      
      // Compute dashboard stats from sample data
      const activeStations = sampleStations.filter(s => s.status === 'Charging').length;
      const activeTransactions = sampleTransactions.filter(t => !t.stopTimestamp).length;
      const totalEnergyDelivered = sampleTransactions.reduce((sum, t) => sum + (t.energyUsed || 0), 0);
      
      // Calculate average session duration from completed transactions
      const completedTransactions = sampleTransactions.filter(t => t.stopTimestamp);
      const averageSessionDuration = completedTransactions.length > 0 
        ? completedTransactions.reduce((sum, t) => {
            const start = new Date(t.startTimestamp).getTime();
            const end = new Date(t.stopTimestamp!).getTime();
            return sum + (end - start) / (60 * 1000); // Convert to minutes
          }, 0) / completedTransactions.length
        : 0;
      
      return {
        totalStations: sampleStations.length,
        activeStations,
        totalTransactions: sampleTransactions.length,
        activeTransactions,
        totalEnergyDelivered,
        averageSessionDuration: Math.round(averageSessionDuration)
      };
    }
  },
  
  getEnergyUsageByDay: async (): Promise<any[]> => {
    try {
      const response = await api.get('/dashboard/energy-by-day');
      return response.data.energyData || [];
    } catch (error) {
      console.warn('Falling back to sample energy usage data', error);
      return [
        { day: 'Monday', value: 65 },
        { day: 'Tuesday', value: 82 },
        { day: 'Wednesday', value: 73 },
        { day: 'Thursday', value: 92 },
        { day: 'Friday', value: 86 },
        { day: 'Saturday', value: 60 },
        { day: 'Sunday', value: 55 }
      ];
    }
  },
  
  getUtilizationByHour: async (): Promise<any[]> => {
    try {
      const response = await api.get('/dashboard/utilization-by-hour');
      return response.data.utilizationData || [];
    } catch (error) {
      console.warn('Falling back to sample utilization data', error);
      return [
        { hour: '12 AM', value: 15 },
        { hour: '3 AM', value: 8 },
        { hour: '6 AM', value: 23 },
        { hour: '9 AM', value: 42 },
        { hour: '12 PM', value: 65 },
        { hour: '3 PM', value: 72 },
        { hour: '6 PM', value: 58 },
        { hour: '9 PM', value: 35 }
      ];
    }
  },
  
  getStatusDistribution: async (): Promise<any[]> => {
    try {
      const response = await api.get('/dashboard/status-distribution');
      return response.data.statusData || [];
    } catch (error) {
      console.warn('Falling back to sample status distribution data', error);
      return [
        { status: 'Available', count: 7 },
        { status: 'Charging', count: 5 },
        { status: 'Faulted', count: 2 },
        { status: 'Unavailable', count: 1 },
        { status: 'Reserved', count: 0 }
      ];
    }
  }
};

export default {
  stations: stationsApi,
  transactions: transactionsApi,
  dashboard: dashboardApi
}; 