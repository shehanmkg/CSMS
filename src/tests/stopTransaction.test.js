const handleStopTransaction = require('../ocpp/handlers/stopTransaction');
const transactionService = require('../services/transactionService');
const stationService = require('../services/stationService');
const { logger } = require('../utils/logger');

// Mock dependencies
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../services/transactionService');
jest.mock('../services/stationService');

describe('StopTransaction Handler', () => {
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
    
    stationService.updateChargePointStatus.mockImplementation(() => true);
    
    transactionService.stopTransaction.mockImplementation((transactionId, meterStop, timestamp, options) => {
      if (transactionId === 12345) {
        return {
          connectorId: 1,
          energyConsumed: 10.5,
          duration: 3600, // 1 hour in seconds
          idTagInfo: options.idTag ? {
            status: 'Accepted',
            expiryDate: '2023-12-31T23:59:59Z'
          } : undefined
        };
      } else if (transactionId === 54321) {
        return {
          connectorId: 2,
          energyConsumed: 5.2,
          duration: 1800, // 30 minutes in seconds
          idTagInfo: options.idTag ? {
            status: 'Accepted',
            expiryDate: '2023-12-31T23:59:59Z'
          } : undefined
        };
      } else {
        throw new Error('Transaction not found');
      }
    });
  });
  
  test('should handle valid StopTransaction request successfully', async () => {
    const payload = {
      transactionId: 12345,
      meterStop: 1500,
      timestamp: '2023-06-15T11:00:00Z'
    };
    
    const result = await handleStopTransaction(payload, 'CP001');
    
    // Verify transaction service was called correctly
    expect(transactionService.stopTransaction).toHaveBeenCalledWith(
      12345,
      1500,
      '2023-06-15T11:00:00Z',
      {
        idTag: undefined,
        reason: undefined,
        transactionData: undefined
      }
    );
    
    // Verify charge point status was updated
    expect(stationService.updateChargePointStatus).toHaveBeenCalledWith(
      'CP001',
      'Available',
      {
        connectorId: 1,
        transactionId: null
      }
    );
    
    // Verify the response structure (empty object if no idTag provided)
    expect(result).toEqual({});
    
    // Verify success was logged
    expect(logger.info).toHaveBeenCalledWith(
      'Transaction stopped successfully',
      expect.objectContaining({
        chargePointId: 'CP001',
        transactionId: 12345,
        energyConsumed: 10.5
      })
    );
  });
  
  test('should handle StopTransaction with ID tag', async () => {
    const payload = {
      transactionId: 12345,
      meterStop: 1500,
      timestamp: '2023-06-15T11:00:00Z',
      idTag: 'validTag123'
    };
    
    const result = await handleStopTransaction(payload, 'CP001');
    
    // Verify transaction service was called with ID tag
    expect(transactionService.stopTransaction).toHaveBeenCalledWith(
      12345,
      1500,
      '2023-06-15T11:00:00Z',
      expect.objectContaining({
        idTag: 'validTag123'
      })
    );
    
    // Verify the response includes idTagInfo
    expect(result).toHaveProperty('idTagInfo');
    expect(result.idTagInfo.status).toBe('Accepted');
  });
  
  test('should handle StopTransaction with reason', async () => {
    const payload = {
      transactionId: 12345,
      meterStop: 1500,
      timestamp: '2023-06-15T11:00:00Z',
      reason: 'EVDisconnected'
    };
    
    await handleStopTransaction(payload, 'CP001');
    
    // Verify transaction service was called with reason
    expect(transactionService.stopTransaction).toHaveBeenCalledWith(
      12345,
      1500,
      '2023-06-15T11:00:00Z',
      expect.objectContaining({
        reason: 'EVDisconnected'
      })
    );
  });
  
  test('should handle StopTransaction with transaction data', async () => {
    const transactionData = [
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
    ];
    
    const payload = {
      transactionId: 12345,
      meterStop: 1500,
      timestamp: '2023-06-15T11:00:00Z',
      transactionData
    };
    
    await handleStopTransaction(payload, 'CP001');
    
    // Verify transaction service was called with transaction data
    expect(transactionService.stopTransaction).toHaveBeenCalledWith(
      12345,
      1500,
      '2023-06-15T11:00:00Z',
      expect.objectContaining({
        transactionData
      })
    );
  });
  
  test('should throw error when transaction is not found', async () => {
    const payload = {
      transactionId: 99999, // Non-existent transaction
      meterStop: 1500,
      timestamp: '2023-06-15T11:00:00Z'
    };
    
    await expect(handleStopTransaction(payload, 'CP001')).rejects.toThrow(
      'Transaction not found'
    );
    
    // Verify charge point status was NOT updated
    expect(stationService.updateChargePointStatus).not.toHaveBeenCalled();
    
    // Verify error was logged
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to stop transaction',
      expect.objectContaining({
        chargePointId: 'CP001',
        transactionId: 99999,
        error: 'Transaction not found'
      })
    );
  });
  
  test('should throw error when charge point is not registered', async () => {
    const payload = {
      transactionId: 12345,
      meterStop: 1500,
      timestamp: '2023-06-15T11:00:00Z'
    };
    
    await expect(handleStopTransaction(payload, 'UnknownCP')).rejects.toThrow(
      'Charge point not registered'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.stopTransaction).not.toHaveBeenCalled();
    
    // Verify warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      'StopTransaction failed - Charge point not registered',
      expect.objectContaining({
        chargePointId: 'UnknownCP'
      })
    );
  });
  
  test('should throw error when transactionId is missing', async () => {
    const payload = {
      meterStop: 1500,
      timestamp: '2023-06-15T11:00:00Z'
    };
    
    await expect(handleStopTransaction(payload, 'CP001')).rejects.toThrow(
      'Missing required field: transactionId'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.stopTransaction).not.toHaveBeenCalled();
  });
  
  test('should throw error when meterStop is missing', async () => {
    const payload = {
      transactionId: 12345,
      timestamp: '2023-06-15T11:00:00Z'
    };
    
    await expect(handleStopTransaction(payload, 'CP001')).rejects.toThrow(
      'Missing required field: meterStop'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.stopTransaction).not.toHaveBeenCalled();
  });
}); 