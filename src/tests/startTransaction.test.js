const handleStartTransaction = require('../ocpp/handlers/startTransaction');
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

describe('StartTransaction Handler', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Set up default mock implementations
    stationService.getChargePoint.mockImplementation((id) => {
      if (id === 'CP001') {
        return { id: 'CP001', status: 'Available' };
      }
      return null;
    });
    
    stationService.updateChargePointStatus.mockImplementation(() => true);
    
    transactionService.startTransaction.mockImplementation((chargePointId, connectorId, idTag) => {
      if (idTag === 'validTag123') {
        return {
          transactionId: 12345,
          idTagInfo: {
            status: 'Accepted',
            expiryDate: '2023-12-31T23:59:59Z'
          }
        };
      } else {
        return {
          transactionId: 0,
          idTagInfo: {
            status: 'Invalid'
          }
        };
      }
    });
  });
  
  test('should handle valid StartTransaction request successfully', async () => {
    const payload = {
      idTag: 'validTag123',
      connectorId: 1,
      meterStart: 1000,
      timestamp: '2023-06-15T10:00:00Z'
    };
    
    const result = await handleStartTransaction(payload, 'CP001');
    
    // Verify transaction service was called correctly
    expect(transactionService.startTransaction).toHaveBeenCalledWith(
      'CP001',
      1,
      'validTag123',
      1000,
      '2023-06-15T10:00:00Z',
      null
    );
    
    // Verify charge point status was updated
    expect(stationService.updateChargePointStatus).toHaveBeenCalledWith(
      'CP001',
      'Charging',
      {
        connectorId: 1,
        transactionId: 12345
      }
    );
    
    // Verify the response structure
    expect(result).toEqual({
      transactionId: 12345,
      idTagInfo: {
        status: 'Accepted',
        expiryDate: '2023-12-31T23:59:59Z'
      }
    });
    
    // Verify success was logged
    expect(logger.info).toHaveBeenCalledWith(
      'Transaction started successfully',
      expect.objectContaining({
        chargePointId: 'CP001',
        connectorId: 1,
        transactionId: 12345
      })
    );
  });
  
  test('should handle StartTransaction with reservation ID', async () => {
    const payload = {
      idTag: 'validTag123',
      connectorId: 1,
      meterStart: 1000,
      timestamp: '2023-06-15T10:00:00Z',
      reservationId: 5678
    };
    
    await handleStartTransaction(payload, 'CP001');
    
    // Verify transaction service was called with reservation ID
    expect(transactionService.startTransaction).toHaveBeenCalledWith(
      'CP001',
      1,
      'validTag123',
      1000,
      '2023-06-15T10:00:00Z',
      { reservationId: 5678 }
    );
  });
  
  test('should reject transaction with invalid ID tag', async () => {
    const payload = {
      idTag: 'invalidTag',
      connectorId: 1,
      meterStart: 1000,
      timestamp: '2023-06-15T10:00:00Z'
    };
    
    const result = await handleStartTransaction(payload, 'CP001');
    
    // Verify transaction service was called
    expect(transactionService.startTransaction).toHaveBeenCalled();
    
    // Verify charge point status was NOT updated
    expect(stationService.updateChargePointStatus).not.toHaveBeenCalled();
    
    // Verify the response structure with rejected status
    expect(result).toEqual({
      transactionId: 0,
      idTagInfo: {
        status: 'Invalid'
      }
    });
    
    // Verify rejection was logged
    expect(logger.warn).toHaveBeenCalledWith(
      'Transaction start rejected',
      expect.objectContaining({
        chargePointId: 'CP001',
        idTag: 'invalidTag',
        status: 'Invalid'
      })
    );
  });
  
  test('should throw error when charge point is not registered', async () => {
    const payload = {
      idTag: 'validTag123',
      connectorId: 1,
      meterStart: 1000,
      timestamp: '2023-06-15T10:00:00Z'
    };
    
    await expect(handleStartTransaction(payload, 'UnknownCP')).rejects.toThrow(
      'Charge point not registered'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.startTransaction).not.toHaveBeenCalled();
    
    // Verify warning was logged
    expect(logger.warn).toHaveBeenCalledWith(
      'StartTransaction failed - Charge point not registered',
      expect.objectContaining({
        chargePointId: 'UnknownCP'
      })
    );
  });
  
  test('should throw error when idTag is missing', async () => {
    const payload = {
      connectorId: 1,
      meterStart: 1000,
      timestamp: '2023-06-15T10:00:00Z'
    };
    
    await expect(handleStartTransaction(payload, 'CP001')).rejects.toThrow(
      'Missing required field: idTag'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.startTransaction).not.toHaveBeenCalled();
  });
  
  test('should throw error when connectorId is missing', async () => {
    const payload = {
      idTag: 'validTag123',
      meterStart: 1000,
      timestamp: '2023-06-15T10:00:00Z'
    };
    
    await expect(handleStartTransaction(payload, 'CP001')).rejects.toThrow(
      'Missing required field: connectorId'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.startTransaction).not.toHaveBeenCalled();
  });
  
  test('should throw error when meterStart is missing', async () => {
    const payload = {
      idTag: 'validTag123',
      connectorId: 1,
      timestamp: '2023-06-15T10:00:00Z'
    };
    
    await expect(handleStartTransaction(payload, 'CP001')).rejects.toThrow(
      'Missing required field: meterStart'
    );
    
    // Verify transaction service was NOT called
    expect(transactionService.startTransaction).not.toHaveBeenCalled();
  });
}); 