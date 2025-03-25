const stationService = require('../services/stationService');

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Station Service', () => {
  const testChargePointId = 'TEST_CP001';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset any existing data
    const allChargePoints = stationService.getAllChargePoints();
    allChargePoints.forEach(cp => {
      // Use a direct way to clear the Map - not ideal but works for testing
      // Note: This is testing-specific code that exploits knowledge of the implementation
      stationService.updateChargePoint(cp.id, null);
    });
  });
  
  describe('Basic CRUD operations', () => {
    it('should update and retrieve charge point data', () => {
      // Initial data shouldn't exist
      expect(stationService.getChargePoint(testChargePointId)).toBeNull();
      
      // Update with basic data
      const testData = { status: 'Available', vendor: 'Test' };
      stationService.updateChargePoint(testChargePointId, testData);
      
      // Retrieve and verify
      const cp = stationService.getChargePoint(testChargePointId);
      expect(cp).not.toBeNull();
      expect(cp.status).toBe('Available');
      expect(cp.vendor).toBe('Test');
      expect(cp.lastUpdated).toBeInstanceOf(Date);
    });
    
    it('should throw an error when chargePointId is missing', () => {
      expect(() => stationService.updateChargePoint(null, { status: 'Available' }))
        .toThrow('chargePointId is required');
        
      expect(() => stationService.getChargePoint(null))
        .toThrow('chargePointId is required');
    });
    
    it('should return all charge points as an array', () => {
      // Add a few charge points
      stationService.updateChargePoint('CP1', { vendor: 'Vendor1' });
      stationService.updateChargePoint('CP2', { vendor: 'Vendor2' });
      
      const allCPs = stationService.getAllChargePoints();
      expect(Array.isArray(allCPs)).toBe(true);
      expect(allCPs.length).toBe(2);
      
      // Check that the IDs are included
      expect(allCPs.find(cp => cp.id === 'CP1')).toBeTruthy();
      expect(allCPs.find(cp => cp.id === 'CP2')).toBeTruthy();
    });
  });
  
  describe('Status update operations', () => {
    it('should update status with additional data', () => {
      stationService.updateChargePointStatus(testChargePointId, 'Charging', {
        connectorId: 1,
        errorCode: 'NoError'
      });
      
      const cp = stationService.getChargePoint(testChargePointId);
      expect(cp.status).toBe('Charging');
      expect(cp.connectorId).toBe(1);
      expect(cp.errorCode).toBe('NoError');
      expect(cp.statusUpdatedAt).toBeInstanceOf(Date);
    });
  });
  
  describe('OCPP message handlers', () => {
    it('should handle BootNotification properly', () => {
      const bootData = {
        chargePointVendor: 'Vendor',
        chargePointModel: 'Model',
        firmwareVersion: '1.0'
      };
      
      stationService.handleBootNotification(testChargePointId, bootData);
      
      const cp = stationService.getChargePoint(testChargePointId);
      expect(cp.chargePointVendor).toBe('Vendor');
      expect(cp.chargePointModel).toBe('Model');
      expect(cp.firmwareVersion).toBe('1.0');
      expect(cp.registered).toBe(true);
      expect(cp.registeredAt).toBeInstanceOf(Date);
    });
    
    it('should handle StatusNotification properly', () => {
      const statusData = {
        status: 'Faulted',
        errorCode: 'HighTemperature',
        connectorId: 2,
        info: 'Temperature exceeded',
        timestamp: '2023-03-22T12:01:30Z'
      };
      
      stationService.handleStatusNotification(testChargePointId, statusData);
      
      const cp = stationService.getChargePoint(testChargePointId);
      expect(cp.status).toBe('Faulted');
      expect(cp.errorCode).toBe('HighTemperature');
      expect(cp.connectorId).toBe(2);
      expect(cp.info).toBe('Temperature exceeded');
      expect(cp.timestampFromCP).toBeInstanceOf(Date);
    });
    
    it('should handle Heartbeat properly', () => {
      stationService.handleHeartbeat(testChargePointId);
      
      const cp = stationService.getChargePoint(testChargePointId);
      expect(cp.lastHeartbeat).toBeInstanceOf(Date);
    });
  });
}); 