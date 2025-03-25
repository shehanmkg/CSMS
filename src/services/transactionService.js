const { logger } = require('../utils/logger');
const authService = require('./authService');

// In-memory storage for transactions
const transactions = new Map();
let transactionIdCounter = 1;

/**
 * Generate a new unique transaction ID
 * 
 * @returns {number} A new transaction ID
 */
function generateTransactionId() {
  return transactionIdCounter++;
}

/**
 * Start a new transaction
 * 
 * @param {string} chargePointId - The charge point ID
 * @param {number} connectorId - The connector ID
 * @param {string} idTag - The identification token
 * @param {number} meterStart - The meter value in Wh at start
 * @param {string} timestamp - The timestamp of the start
 * @param {object} reservationData - Optional reservation data
 * @returns {object} Transaction data including ID and auth status
 */
function startTransaction(chargePointId, connectorId, idTag, meterStart, timestamp, reservationData = null) {
  // Verify that the ID tag is authorized
  const authInfo = authService.validateToken(idTag);
  
  if (authInfo.status !== 'Accepted') {
    logger.warn('Transaction start rejected - ID tag not authorized', {
      chargePointId,
      connectorId,
      idTag,
      authStatus: authInfo.status
    });
    
    return {
      transactionId: -1,
      idTagInfo: authInfo
    };
  }
  
  // Generate a new transaction ID
  const transactionId = generateTransactionId();
  
  // Create the transaction
  const transaction = {
    transactionId,
    chargePointId,
    connectorId,
    idTag,
    meterStart,
    startTime: timestamp || new Date().toISOString(),
    startResult: 'Accepted',
    reservationId: reservationData?.reservationId,
    status: 'In progress',
    meterValues: [],
    lastUpdated: new Date().toISOString()
  };
  
  // Store the transaction
  transactions.set(transactionId, transaction);
  
  logger.info('Transaction started', {
    transactionId,
    chargePointId,
    connectorId,
    idTag
  });
  
  // Return transaction data with auth info
  return {
    transactionId,
    idTagInfo: authInfo
  };
}

/**
 * Stop an existing transaction
 * 
 * @param {number} transactionId - The transaction ID
 * @param {string} idTag - The identification token
 * @param {number} meterStop - The meter value in Wh at stop
 * @param {string} timestamp - The timestamp of the stop
 * @param {string} reason - The reason for stopping
 * @returns {object} Stop transaction result
 */
function stopTransaction(transactionId, idTag, meterStop, timestamp, reason = null) {
  // Check if transaction exists
  if (!transactions.has(transactionId)) {
    logger.warn('Transaction stop failed - Transaction not found', {
      transactionId
    });
    
    return {
      idTagInfo: { status: 'Invalid' }
    };
  }
  
  const transaction = transactions.get(transactionId);
  
  // Optional ID tag validation - if provided, it should be the same as the one that started
  // the transaction or be authorized to stop any transaction
  if (idTag && idTag !== transaction.idTag) {
    const authInfo = authService.validateToken(idTag);
    
    // If tag is different and not accepted, reject
    if (authInfo.status !== 'Accepted') {
      logger.warn('Transaction stop rejected - ID tag not authorized', {
        transactionId,
        originalIdTag: transaction.idTag,
        providedIdTag: idTag,
        authStatus: authInfo.status
      });
      
      return {
        idTagInfo: authInfo
      };
    }
  }
  
  // Update transaction
  transaction.meterStop = meterStop;
  transaction.stopTime = timestamp || new Date().toISOString();
  transaction.stopReason = reason;
  transaction.status = 'Completed';
  transaction.lastUpdated = new Date().toISOString();
  
  // Calculate energy used
  transaction.energyUsed = meterStop - transaction.meterStart;
  
  logger.info('Transaction stopped', {
    transactionId,
    chargePointId: transaction.chargePointId,
    connectorId: transaction.connectorId,
    energyUsed: transaction.energyUsed
  });
  
  // For verification purposes, return the ID tag info
  return {
    idTagInfo: {
      status: 'Accepted'
    }
  };
}

/**
 * Get a transaction by ID
 * 
 * @param {number} transactionId - The transaction ID
 * @returns {object|null} Transaction object or null if not found
 */
function getTransaction(transactionId) {
  return transactions.get(transactionId) || null;
}

/**
 * Get all transactions for a charge point
 * 
 * @param {string} chargePointId - The charge point ID
 * @returns {Array} Array of transaction objects
 */
function getTransactionsByChargePoint(chargePointId) {
  const result = [];
  
  transactions.forEach(transaction => {
    if (transaction.chargePointId === chargePointId) {
      result.push(transaction);
    }
  });
  
  return result;
}

/**
 * Add a meter value to a transaction
 * 
 * @param {number} transactionId - The transaction ID
 * @param {object} meterValue - The meter value
 * @returns {boolean} Success status
 */
function addMeterValue(transactionId, meterValue) {
  if (!transactions.has(transactionId)) {
    return false;
  }
  
  const transaction = transactions.get(transactionId);
  
  // Add meter value to the transaction
  transaction.meterValues.push(meterValue);
  transaction.lastUpdated = new Date().toISOString();
  
  return true;
}

/**
 * Get all transactions in the system
 * 
 * @returns {Array} Array of transaction objects
 */
function getAllTransactions() {
  return Array.from(transactions.values());
}

module.exports = {
  startTransaction,
  stopTransaction,
  getTransaction,
  getTransactionsByChargePoint,
  addMeterValue,
  getAllTransactions
}; 