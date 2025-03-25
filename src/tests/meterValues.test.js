const handleMeterValues = require('../ocpp/handlers/meterValues');
const transactionService = require('../services/transactionService');
const stationService = require('../services/stationService');
const { logger } = require('../utils/logger');

// Mock dependencies
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../services/transactionService');
jest.mock('../services/stationService');

describe('MeterValues Handler', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock implementations
    stationService.getChargePoint.mockImplementation((id) => {
      if (id === 'CP001') {
        return { id: 'CP001', status: 'Charging' };
      }
      return null;
    });
    
    stationService.updateChargePointMeterValue.mockImplementation(() => true);
    
    transactionService.addMeterValue.mockImplementation((transactionId) => {
      return transactionId === 12345; // Return true for valid transaction ID
    });
  });
  
  test('should handle valid MeterValues during transaction', async () => {
    const payload = {
      connectorId: 1,
      transactionId: 12345,
      meterValue: [
        {
          timestamp: '2023-06-15T10:30:00Z',
          sampledValue: [
            {
              value: '1250',
              context: 'Sample.Periodic',
              format: 'Raw',
              measurand: 'Energy.Active.Import.Register',
              unit: 'Wh'
            }
          ]
        }
      ]
    };
    
    const response = await handleMeterValues(payload, 'CP001');
    
    // Verify transaction service was called correctly
    expect(transactionService.addMeterValue).toHaveBeenCalledWith(
      12345,
      1,
      expect.any(Array)
    );
    
    // Verify charge point meter value was updated
    expect(stationService.updateChargePointMeterValue).toHaveBeenCalledWith(
      'CP001',
      1,
      expect.objectContaining({
        value: 1250,
        unit: 'Wh'
      })
    );
    
    // Verify the response is an empty object as per OCPP 1.6J spec
    expect(response).toEqual({});
    
    // Verify proper logging occurred
    expect(logger.info).toHaveBeenCalledWith(
      'MeterValues request received',
      expect.objectContaining({
        chargePointId: 'CP001',
        connectorId: 1,
        transactionId: 12345
      })
    );
  });
  
  test('should handle valid MeterValues outside of transaction', async () => {
    const payload = {
      connectorId: 2,
      // No transactionId
      meterValue: [
        {
          timestamp: '2023-06-15T10:30:00Z',
          sampledValue: [
            {
              value: '500',
              measurand: 'Voltage',
              unit: 'V'
            }
          ]
        }
      ]
    };
    
    const response = await handleMeterValues(payload, 'CP001');
    
    // Verify transaction service was NOT called
    expect(transactionService.addMeterValue).not.toHaveBeenCalled();
    
    // Verify the response is an empty object
    expect(response).toEqual({});
    
    // Non-energy readings should not update the charge point meter value
    expect(stationService.updateChargePointMeterValue).not.toHaveBeenCalled();
  });
  
  test('should process multiple meter values and measurements', async () => {
    const payload = {
      connectorId: 1,
      transactionId: 12345,
      meterValue: [
        {
          timestamp: '2023-06-15T10:30:00Z',
          sampledValue: [
            {
              value: '1250',
              measurand: 'Energy.Active.Import.Register',
              unit: 'Wh'
            },
            {
              value: '220',
              measurand: 'Voltage',
              unit: 'V'
            }
          ]
        },
        {
          timestamp: '2023-06-15T10:31:00Z',
          sampledValue: [
            {
              value: '1275',
              measurand: 'Energy.Active.Import.Register',
              unit: 'Wh'
            }
          ]
        }
      ]
    };
    
    await handleMeterValues(payload, 'CP001');
    
    // Verify transaction service was called with all values
    expect(transactionService.addMeterValue).toHaveBeenCalledWith(
      12345,
      1,
      expect.arrayContaining([
        expect.objectContaining({ timestamp: '2023-06-15T10:30:00Z' }),
        expect.objectContaining({ timestamp: '2023-06-15T10:31:00Z' })
      ])
    );
    
    // Verify charge point meter value was updated with the latest energy reading
    expect(stationService.updateChargePointMeterValue).toHaveBeenCalledWith(
      'CP001',
      1,
      expect.objectContaining({
        value: 1275,
        unit: 'Wh',
        timestamp: '2023-06-15T10:31:00Z'
      })
    );
  });
  
  test('should handle transaction not found for meter values', async () => {
    const payload = {
      connectorId: 1,
      transactionId: 99999, // Invalid transaction ID
      meterValue: [
        {
          timestamp: '2023-06-15T10:30:00Z',
          sampledValue: [
            {
              value: '1250',
              measurand: 'Energy.Active.Import.Register',
              unit: 'Wh'
            }
          ]
        }
      ]
    };
    
    const response = await handleMeterValues(payload, 'CP001');
    
    // Verify transaction service was called
    expect(transactionService.addMeterValue).toHaveBeenCalled();
    
    // Verify the response is still an empty object
    expect(response).toEqual({});
    
    // Verify warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to add meter values - Transaction not found',
      expect.objectContaining({
        chargePointId: 'CP001',
        transactionId: 99999
      })
    );
    
    // Verify charge point meter value was still updated
    expect(stationService.updateChargePointMeterValue).toHaveBeenCalled();
  });
  
  test('should throw error when charge point is not registered', async () => {
    const payload = {
      connectorId: 1,
      meterValue: [
        {
          timestamp: '2023-06-15T10:30:00Z',
          sampledValue: [
            {
              value: '1250',
              unit: 'Wh'
            }
          ]
        }
      ]
    };
    
    await expect(handleMeterValues(payload, 'UnknownCP')).rejects.toThrow(
      'Charge point not registered'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.addMeterValue).not.toHaveBeenCalled();
    
    // Verify warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      'MeterValues failed - Charge point not registered',
      expect.objectContaining({
        chargePointId: 'UnknownCP'
      })
    );
  });
  
  test('should throw error when connectorId is missing', async () => {
    const payload = {
      // Missing connectorId
      meterValue: [
        {
          timestamp: '2023-06-15T10:30:00Z',
          sampledValue: [
            {
              value: '1250',
              unit: 'Wh'
            }
          ]
        }
      ]
    };
    
    await expect(handleMeterValues(payload, 'CP001')).rejects.toThrow(
      'Missing required field: connectorId'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.addMeterValue).not.toHaveBeenCalled();
  });
  
  test('should throw error when meterValue is missing', async () => {
    const payload = {
      connectorId: 1
      // Missing meterValue
    };
    
    await expect(handleMeterValues(payload, 'CP001')).rejects.toThrow(
      'Missing or invalid required field: meterValue'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.addMeterValue).not.toHaveBeenCalled();
  });
  
  test('should throw error when meterValue is empty array', async () => {
    const payload = {
      connectorId: 1,
      meterValue: [] // Empty array
    };
    
    await expect(handleMeterValues(payload, 'CP001')).rejects.toThrow(
      'Missing or invalid required field: meterValue'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.addMeterValue).not.toHaveBeenCalled();
  });
}); 