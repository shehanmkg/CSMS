const { logger } = require('../../utils/logger');
const transactionService = require('../../services/transactionService');
const stationService = require('../../services/stationService');

/**
 * StartTransaction handler
 * 
 * This handler processes requests to start a charging transaction.
 * It validates the ID token, initializes a transaction, and returns a transaction ID.
 * 
 * @param {object} payload - The StartTransaction request payload
 * @param {string} chargePointId - The ID of the charge point
 * @returns {object} - The StartTransaction response with transaction ID and authorization status
 */
async function handleStartTransaction(payload, chargePointId) {
  logger.info('StartTransaction request received', {
    chargePointId,
    idTag: payload.idTag,
    connectorId: payload.connectorId
  });

  // Validate required fields
  if (!payload.idTag) {
    throw new Error('Missing required field: idTag');
  }
  
  if (payload.connectorId === undefined) {
    throw new Error('Missing required field: connectorId');
  }
  
  if (payload.meterStart === undefined) {
    throw new Error('Missing required field: meterStart');
  }

  // Get charge point information
  const chargePoint = stationService.getChargePoint(chargePointId);
  
  if (!chargePoint) {
    logger.warn('StartTransaction failed - Charge point not registered', {
      chargePointId
    });
    
    throw new Error('Charge point not registered');
  }
  
  // Start the transaction
  const transactionResult = transactionService.startTransaction(
    chargePointId,
    payload.connectorId,
    payload.idTag,
    payload.meterStart,
    payload.timestamp,
    payload.reservationId ? { reservationId: payload.reservationId } : null
  );
  
  // Update the charge point status to reflect charging
  if (transactionResult.transactionId > 0) {
    stationService.updateChargePointStatus(chargePointId, 'Charging', {
      connectorId: payload.connectorId,
      transactionId: transactionResult.transactionId
    });
    
    logger.info('Transaction started successfully', {
      chargePointId,
      connectorId: payload.connectorId,
      transactionId: transactionResult.transactionId
    });
  } else {
    logger.warn('Transaction start rejected', {
      chargePointId,
      idTag: payload.idTag,
      status: transactionResult.idTagInfo.status
    });
  }

  // Return the response as per OCPP 1.6 spec
  return {
    transactionId: transactionResult.transactionId,
    idTagInfo: transactionResult.idTagInfo
  };
}

module.exports = handleStartTransaction; 