const { logger } = require('../../utils/logger');
const transactionService = require('../../services/transactionService');
const stationService = require('../../services/stationService');

/**
 * StopTransaction handler
 * 
 * This handler processes requests to stop a charging transaction.
 * It verifies the transaction, updates its status, and handles any meter values.
 * 
 * @param {object} payload - The StopTransaction request payload
 * @param {string} chargePointId - The ID of the charge point
 * @returns {object} - The StopTransaction response with authorization status
 */
async function handleStopTransaction(payload, chargePointId) {
  logger.info('StopTransaction request received', {
    chargePointId,
    transactionId: payload.transactionId,
    meterStop: payload.meterStop,
    reason: payload.reason || 'Not specified'
  });

  // Validate required fields
  if (payload.transactionId === undefined) {
    throw new Error('Missing required field: transactionId');
  }
  
  if (payload.meterStop === undefined) {
    throw new Error('Missing required field: meterStop');
  }

  // Get charge point information
  const chargePoint = stationService.getChargePoint(chargePointId);
  
  if (!chargePoint) {
    logger.warn('StopTransaction failed - Charge point not registered', {
      chargePointId
    });
    
    throw new Error('Charge point not registered');
  }
  
  try {
    // Attempt to stop the transaction
    const stopResult = transactionService.stopTransaction(
      payload.transactionId,
      payload.meterStop,
      payload.timestamp,
      {
        idTag: payload.idTag,
        reason: payload.reason,
        transactionData: payload.transactionData
      }
    );
    
    // If we get here, the transaction was successfully stopped
    // Update the charge point status to Available
    stationService.updateChargePointStatus(chargePointId, 'Available', {
      connectorId: stopResult.connectorId,
      transactionId: null
    });
    
    logger.info('Transaction stopped successfully', {
      chargePointId,
      transactionId: payload.transactionId,
      energyConsumed: stopResult.energyConsumed || 0,
      duration: stopResult.duration
    });
    
    // Handle the case when idTag is provided in the stop request
    // Return the proper idTagInfo in response
    const response = {};
    if (payload.idTag) {
      response.idTagInfo = stopResult.idTagInfo;
    }
    
    return response;
    
  } catch (error) {
    logger.error('Failed to stop transaction', {
      chargePointId,
      transactionId: payload.transactionId,
      error: error.message
    });
    
    // Return an empty object as per OCPP 1.6 spec for errors
    // The actual error is thrown and handled by the message handler
    throw error;
  }
}

module.exports = handleStopTransaction; 