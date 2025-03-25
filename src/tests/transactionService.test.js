const transactionService = require('../services/transactionService');
const authService = require('../services/authService');

// Mock the logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock the auth service
jest.mock('../services/authService', () => ({
  validateToken: jest.fn()
}));

describe('Transaction Service', () => {
  const testChargePointId = 'CP001';
  const validIdTag = 'valid123';
  const invalidIdTag = 'invalid456';
  const testConnectorId = 1;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock auth service responses
    authService.validateToken.mockImplementation((idTag) => {
      if (idTag === validIdTag) {
        return { status: 'Accepted' };
      } else {
        return { status: 'Invalid' };
      }
    });
  });
  
  describe('startTransaction', () => {
    it('should start a transaction with valid ID tag', () => {
      const result = transactionService.startTransaction(
        testChargePointId,
        testConnectorId,
        validIdTag,
        0, // meterStart
        new Date().toISOString()
      );
      
      expect(result).toHaveProperty('transactionId');
      expect(result.transactionId).toBeGreaterThan(0);
      expect(result).toHaveProperty('idTagInfo');
      expect(result.idTagInfo.status).toBe('Accepted');
    });
    
    it('should reject transaction with invalid ID tag', () => {
      const result = transactionService.startTransaction(
        testChargePointId,
        testConnectorId,
        invalidIdTag,
        0,
        new Date().toISOString()
      );
      
      expect(result.transactionId).toBe(-1);
      expect(result.idTagInfo.status).toBe('Invalid');
    });
    
    it('should store transaction details correctly', () => {
      const meterStart = 100;
      const timestamp = new Date().toISOString();
      
      const result = transactionService.startTransaction(
        testChargePointId,
        testConnectorId,
        validIdTag,
        meterStart,
        timestamp
      );
      
      const transaction = transactionService.getTransaction(result.transactionId);
      expect(transaction).not.toBeNull();
      expect(transaction.chargePointId).toBe(testChargePointId);
      expect(transaction.connectorId).toBe(testConnectorId);
      expect(transaction.idTag).toBe(validIdTag);
      expect(transaction.meterStart).toBe(meterStart);
      expect(transaction.startTime).toBe(timestamp);
      expect(transaction.status).toBe('In progress');
    });
  });
  
  describe('stopTransaction', () => {
    let transactionId;
    
    beforeEach(() => {
      // Start a test transaction
      const result = transactionService.startTransaction(
        testChargePointId,
        testConnectorId,
        validIdTag,
        100,
        new Date().toISOString()
      );
      
      transactionId = result.transactionId;
    });
    
    it('should stop an existing transaction', () => {
      const meterStop = 150;
      const result = transactionService.stopTransaction(
        transactionId,
        validIdTag,
        meterStop,
        new Date().toISOString()
      );
      
      expect(result.idTagInfo.status).toBe('Accepted');
      
      // Check transaction status
      const transaction = transactionService.getTransaction(transactionId);
      expect(transaction.status).toBe('Completed');
      expect(transaction.meterStop).toBe(meterStop);
      expect(transaction.energyUsed).toBe(meterStop - transaction.meterStart);
    });
    
    it('should reject stopping non-existent transaction', () => {
      const result = transactionService.stopTransaction(
        9999, // Non-existent transaction ID
        validIdTag,
        150,
        new Date().toISOString()
      );
      
      expect(result.idTagInfo.status).toBe('Invalid');
    });
    
    it('should allow stopping with the original ID tag', () => {
      const result = transactionService.stopTransaction(
        transactionId,
        validIdTag, // Same as start
        150,
        new Date().toISOString()
      );
      
      expect(result.idTagInfo.status).toBe('Accepted');
    });
  });
  
  describe('transaction retrieval', () => {
    let transactionId;
    
    beforeEach(() => {
      // Start a test transaction
      const result = transactionService.startTransaction(
        testChargePointId,
        testConnectorId,
        validIdTag,
        100,
        new Date().toISOString()
      );
      
      transactionId = result.transactionId;
    });
    
    it('should retrieve a transaction by ID', () => {
      const transaction = transactionService.getTransaction(transactionId);
      expect(transaction).not.toBeNull();
      expect(transaction.transactionId).toBe(transactionId);
    });
    
    it('should retrieve transactions by charge point', () => {
      const transactions = transactionService.getTransactionsByChargePoint(testChargePointId);
      expect(transactions.length).toBeGreaterThan(0);
      expect(transactions[0].chargePointId).toBe(testChargePointId);
    });
    
    it('should retrieve all transactions', () => {
      const transactions = transactionService.getAllTransactions();
      expect(transactions.length).toBeGreaterThan(0);
    });
  });
  
  describe('meter values', () => {
    let transactionId;
    
    beforeEach(() => {
      // Start a test transaction
      const result = transactionService.startTransaction(
        testChargePointId,
        testConnectorId,
        validIdTag,
        100,
        new Date().toISOString()
      );
      
      transactionId = result.transactionId;
    });
    
    it('should add meter values to a transaction', () => {
      const meterValue = {
        timestamp: new Date().toISOString(),
        value: 120,
        unit: 'Wh'
      };
      
      const success = transactionService.addMeterValue(transactionId, meterValue);
      expect(success).toBe(true);
      
      const transaction = transactionService.getTransaction(transactionId);
      expect(transaction.meterValues.length).toBe(1);
      expect(transaction.meterValues[0]).toEqual(meterValue);
    });
    
    it('should handle adding meter values to non-existent transaction', () => {
      const success = transactionService.addMeterValue(9999, {});
      expect(success).toBe(false);
    });
  });
}); 