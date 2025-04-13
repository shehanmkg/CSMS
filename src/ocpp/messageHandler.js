const { logger } = require('../utils/logger');
const { getHandlerForAction } = require('./handlers');
const stationService = require('../services/stationService');

// Message types as per OCPP spec
const MESSAGE_TYPE = {
  CALL: 2,
  CALLRESULT: 3,
  CALLERROR: 4
};

/**
 * Process an OCPP message
 * 
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} message - The raw message string
 * @returns {Promise<void>}
 */
async function processOcppMessage(ws, message) {
  try {
    const parsedMessage = JSON.parse(message);
    
    // Log incoming message
    logger.debug('Received OCPP message:', {
      chargePointId: ws.chargePointId,
      message: parsedMessage
    });
    
    // Validate the message format
    if (!Array.isArray(parsedMessage) || parsedMessage.length < 3) {
      throw new Error('Invalid message format');
    }
    
    // Extract the message type and handle accordingly
    const messageType = parsedMessage[0];
    
    switch (messageType) {
      case MESSAGE_TYPE.CALL:
        // Handle Call message [2, messageId, action, payload]
        if (parsedMessage.length < 4) throw new Error('Invalid Call message format');
        await handleCall(ws, parsedMessage[1], parsedMessage[2], parsedMessage[3]);
        break;
        
      case MESSAGE_TYPE.CALLRESULT:
        // Handle CallResult message [3, messageId, payload]
        await handleCallResult(ws, parsedMessage[1], parsedMessage[2]);
        break;
        
      case MESSAGE_TYPE.CALLERROR:
        // Handle CallError message [4, messageId, errorCode, errorDescription, errorDetails]
        await handleCallError(
          ws, 
          parsedMessage[1], 
          parsedMessage[2], 
          parsedMessage[3], 
          parsedMessage[4] || {}
        );
        break;
        
      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }
  } catch (error) {
    logger.error('Error processing OCPP message:', {
      error: error.message,
      chargePointId: ws.chargePointId || 'unknown',
      rawMessage: message
    });
  }
}

/**
 * Process an OCPP Call message for a specific action
 * 
 * @param {string} action - The OCPP action
 * @param {object} payload - The message payload
 * @param {string} chargePointId - The charge point ID 
 * @returns {Promise<object>} The response payload
 */
async function processOcppCall(action, payload, chargePointId) {
  const handler = getHandlerForAction(action);
  
  if (!handler) {
    throw new Error(`No handler found for action: ${action}`);
  }
  
  return handler(payload, chargePointId);
}

/**
 * Handle an OCPP Call message
 * 
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} messageId - The message ID
 * @param {string} action - The OCPP action
 * @param {object} payload - The message payload
 * @returns {Promise<void>}
 */
async function handleCall(ws, messageId, action, payload) {
  logger.info(`Handling ${action} request`, {
    chargePointId: ws.chargePointId,
    messageId
  });

  try {
    // Process the message using the appropriate handler
    const response = await processOcppCall(action, payload, ws.chargePointId);
    
    // Update charge point data based on the action
    updateChargePointData(ws.chargePointId, action, payload);
    
    // Send the response
    const callResult = [MESSAGE_TYPE.CALLRESULT, messageId, response];
    ws.send(JSON.stringify(callResult));
    
    logger.debug(`Sent ${action} response`, {
      chargePointId: ws.chargePointId,
      messageId,
      response
    });
  } catch (error) {
    logger.error(`Error handling ${action}:`, {
      error: error.message,
      chargePointId: ws.chargePointId
    });
    
    // Send error response
    const errorResponse = [
      MESSAGE_TYPE.CALLERROR, 
      messageId, 
      "InternalError", 
      error.message || "Unknown error", 
      {}
    ];
    ws.send(JSON.stringify(errorResponse));
  }
}

/**
 * Handle an OCPP CallResult message
 * 
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} messageId - The message ID
 * @param {object} payload - The message payload
 * @returns {Promise<void>}
 */
async function handleCallResult(ws, messageId, payload) {
  logger.info(`Received CallResult for message ${messageId}`, {
    chargePointId: ws.chargePointId,
    payload
  });
  // In the current implementation, the server doesn't send Call messages to clients,
  // so we don't expect to receive CallResults.
  // This would be implemented when we add server-initiated operations.
}

/**
 * Handle an OCPP CallError message
 * 
 * @param {WebSocket} ws - The WebSocket connection
 * @param {string} messageId - The message ID
 * @param {string} errorCode - The error code
 * @param {string} errorDescription - The error description
 * @param {object} errorDetails - Additional error details
 * @returns {Promise<void>}
 */
async function handleCallError(ws, messageId, errorCode, errorDescription, errorDetails) {
  logger.error(`Received CallError for message ${messageId}`, {
    chargePointId: ws.chargePointId,
    errorCode,
    errorDescription,
    errorDetails
  });
  // Similar to CallResult, we don't expect to receive these in the current implementation
}

/**
 * Update stored charge point data based on action and payload
 * 
 * @param {string} chargePointId - The charge point ID
 * @param {string} action - The OCPP action
 * @param {object} payload - The message payload
 */
function updateChargePointData(chargePointId, action, payload) {
  try {
    switch (action) {
      case 'BootNotification':
        stationService.handleBootNotification(chargePointId, payload);
        break;
        
      case 'Heartbeat':
        stationService.handleHeartbeat(chargePointId);
        break;
        
      case 'StatusNotification':
        stationService.handleStatusNotification(chargePointId, payload);
        break;
        
      case 'MeterValues':
        logger.debug('[messageHandler] Received MeterValues payload:', { chargePointId, payload });
        // Process each meter value in the MeterValues message
        if (payload.meterValue && Array.isArray(payload.meterValue)) {
          // Find energy readings in the meter values
          for (const meterValue of payload.meterValue) {
            if (meterValue.sampledValue && Array.isArray(meterValue.sampledValue)) {
              let energyReading = null;
              const additionalReadings = {};
              
              // First pass: collect all measurements
              for (const sample of meterValue.sampledValue) {
                const measurand = sample.measurand || 'Energy.Active.Import.Register';
                const value = parseFloat(sample.value);
                
                // Collect different types of readings
                if (measurand === 'Energy.Active.Import.Register' || 
                    measurand === 'Energy.Active.Import.Interval') {
                  energyReading = {
                    value: value,
                    unit: sample.unit || 'Wh',
                    timestamp: meterValue.timestamp
                  };
                } else if (measurand === 'Power.Active.Import') {
                  additionalReadings.power = {
                    value: value,
                    unit: sample.unit || 'W'
                  };
                } else if (measurand === 'Voltage') {
                  additionalReadings.voltage = {
                    value: value,
                    unit: sample.unit || 'V'
                  };
                } else if (measurand === 'Current.Import') {
                  additionalReadings.current = {
                    value: value,
                    unit: sample.unit || 'A'
                  };
                }
              }
              
              // Then update with all collected readings
              if (energyReading) {
                logger.debug('[messageHandler] Extracted readings, calling updateChargePointMeterValue', { chargePointId, connectorId: payload.connectorId, energyReading, additionalReadings });
                stationService.updateChargePointMeterValue(
                  chargePointId,
                  payload.connectorId,
                  energyReading,
                  additionalReadings
                );
              }
            }
          }
        }
        break;
        
      default:
        // For other actions, we might not need special handling
        break;
    }
  } catch (error) {
    logger.error(`Error updating charge point data for ${action}:`, {
      error: error.message,
      chargePointId
    });
  }
}

module.exports = {
  processOcppMessage,
  MESSAGE_TYPE,
  // Exported for testing
  processOcppCall,
  updateChargePointData
}; 