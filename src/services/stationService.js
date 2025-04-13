const { logger } = require('../utils/logger');
const transactionService = require('./transactionService');
// const WebSocketServer = require('../websocket/server'); // Remove direct require

// Module variable to hold the WebSocketServer instance
let wsServerInstance = null;

// In-memory storage for charge point data
const chargePoints = new Map();

/**
 * Initialize the station service with required dependencies.
 * @param {object} wsInstance - The WebSocketServer instance.
 */
function initialize(wsInstance) {
  if (!wsInstance) {
    throw new Error('WebSocketServer instance is required for stationService initialization');
  }
  wsServerInstance = wsInstance;
  logger.info('StationService initialized with WebSocketServer instance.');
}

/**
 * Store or update charge point data
 * 
 * @param {string} chargePointId - ID of the charge point
 * @param {object} data - Data to store/update
 */
function updateChargePoint(chargePointId, data) {
  if (!chargePointId) {
    throw new Error('chargePointId is required');
  }

  // Get existing data or initialize a new object
  const existingData = chargePoints.get(chargePointId) || {};
  
  // Merge new data with existing data
  const updatedData = {
    ...existingData,
    ...data,
    lastUpdated: new Date().toISOString()
  };
  
  // Store updated data
  chargePoints.set(chargePointId, updatedData);
  
  logger.debug('Updated charge point data', { 
    chargePointId, 
    updatedFields: Object.keys(data) 
  });

  // Broadcast to frontend clients if available
  if (global.broadcastToFrontend) {
    global.broadcastToFrontend('station_update', {
      chargePointId,
      updatedFields: Object.keys(data),
      timestamp: new Date().toISOString()
    });
  }
  
  return updatedData;
}

/**
 * Get data for a specific charge point
 * 
 * @param {string} chargePointId - ID of the charge point
 * @returns {object|null} Charge point data or null if not found
 */
function getChargePoint(chargePointId) {
  if (!chargePointId) {
    throw new Error('chargePointId is required');
  }
  
  return chargePoints.get(chargePointId) || null;
}

/**
 * Get all charge points
 * 
 * @returns {Array} Array of charge point objects with their IDs
 */
function getAllChargePoints() {
  const result = [];
  
  chargePoints.forEach((data, id) => {
    result.push({
      id,
      ...data
    });
  });
  
  return result;
}

/**
 * Update the status of a charge point
 * 
 * @param {string} chargePointId - ID of the charge point
 * @param {string} status - New status
 * @param {object} additionalData - Any additional data to store with the status update
 */
function updateChargePointStatus(chargePointId, status, additionalData = {}) {
  updateChargePoint(chargePointId, { 
    status,
    ...additionalData,
    statusUpdatedAt: new Date()
  });
}

/**
 * Handle BootNotification data
 * 
 * @param {string} chargePointId - ID of the charge point
 * @param {object} bootData - Boot notification data
 */
function handleBootNotification(chargePointId, bootData) {
  updateChargePoint(chargePointId, {
    chargePointModel: bootData.chargePointModel,
    chargePointVendor: bootData.chargePointVendor,
    firmwareVersion: bootData.firmwareVersion,
    registered: true,
    registeredAt: new Date()
  });
}

/**
 * Handle StatusNotification data
 * 
 * @param {string} chargePointId - ID of the charge point
 * @param {object} statusData - Status notification data
 */
function handleStatusNotification(chargePointId, statusData) {
  const { status, errorCode, info, timestamp, connectorId } = statusData;

  // If connector ID is 0, it indicates the main charge point status (per OCPP 1.6 spec)
  if (connectorId === 0) {
    updateChargePointStatus(chargePointId, status, {
      errorCode: errorCode || null,
      info: info || null,
      timestampFromCP: timestamp ? new Date(timestamp) : null
    });
    logger.debug('Updated main charge point status', {
      chargePointId,
      status,
      errorCode
    });
  } else {
    // For specific connectors, update the connector status in the connectors object
    const existingData = chargePoints.get(chargePointId) || {};
    const connectors = existingData.connectors || {};
    const connectorData = connectors[connectorId] || {};
    
    // Update connector status
    connectors[connectorId] = {
      ...connectorData,
      status: status,
      errorCode: errorCode || null,
      info: info || null,
      statusUpdatedAt: new Date(),
      timestampFromCP: timestamp ? new Date(timestamp) : null
    };
    
    // Update charge point data with connector information
    updateChargePoint(chargePointId, { connectors });
    
    logger.debug('Updated connector status', {
      chargePointId,
      connectorId,
      status,
      errorCode
    });
  }

  // Broadcast connector status update specifically
  if (global.broadcastToFrontend) {
    global.broadcastToFrontend('connector_update', {
      chargePointId,
      connectorId,
      status,
      errorCode: errorCode || null,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle Heartbeat data
 * 
 * @param {string} chargePointId - ID of the charge point
 */
function handleHeartbeat(chargePointId) {
  updateChargePoint(chargePointId, {
    lastHeartbeat: new Date()
  });
}

/**
 * Update meter value for a charge point connector
 * 
 * @param {string} chargePointId - ID of the charge point
 * @param {number} connectorId - ID of the connector
 * @param {object} meterValue - Meter value data
 * @param {number} meterValue.value - The actual meter reading value
 * @param {string} meterValue.unit - The unit of the meter reading (e.g., 'Wh')
 * @param {string} meterValue.timestamp - Timestamp when the reading was taken
 * @param {object} additionalValues - Optional additional measurement values
 */
function updateChargePointMeterValue(chargePointId, connectorId, meterValue, additionalValues = {}) {
  if (!chargePointId) {
    throw new Error('chargePointId is required');
  }
  
  if (connectorId === undefined) {
    throw new Error('connectorId is required');
  }
  
  // Get existing data or initialize a new object
  const existingData = chargePoints.get(chargePointId) || {};
  
  // Initialize connector data structure if it doesn't exist
  const connectors = existingData.connectors || {};
  const connectorData = connectors[connectorId] || {};
  
  // Update connector with meter value and additional measurements
  connectors[connectorId] = {
    ...connectorData,
    meterValue: {
      value: meterValue.value,
      unit: meterValue.unit,
      timestamp: meterValue.timestamp,
      updatedAt: new Date()
    },
    // Add additional measurements if provided
    ...additionalValues
  };
  
  // Update charge point data with connector information
  updateChargePoint(chargePointId, { connectors });
  
  logger.debug('Updated charge point meter value', {
    chargePointId,
    connectorId,
    value: meterValue.value,
    unit: meterValue.unit
  });
}

/**
 * Request to stop an ongoing transaction on a specific connector.
 * 
 * @param {string} chargePointId - ID of the charge point
 * @param {number} connectorId - ID of the connector
 * @returns {Promise<object>} Result of the stop request (e.g., { success: true } or { success: false, message: '...' })
 */
async function stopTransaction(chargePointId, connectorId) {
  logger.info('Received request to stop transaction', { chargePointId, connectorId });

  if (!chargePointId || connectorId === undefined) {
    logger.error('Missing chargePointId or connectorId for stopTransaction');
    throw new Error('Missing chargePointId or connectorId');
  }

  try {
    // 1. Find the active transaction for this connector
    const activeTransaction = transactionService.getActiveTransactionByConnector(chargePointId, connectorId);

    if (!activeTransaction) {
      logger.warn('No active transaction found to stop', { chargePointId, connectorId });
      return { success: false, message: 'No active transaction found on this connector.' };
    }

    // 2. Trigger the OCPP RemoteStopTransaction command
    // Use the injected WebSocketServer instance
    if (!wsServerInstance) {
      logger.error('WebSocketServer instance not initialized in stationService. Cannot stop transaction.');
      throw new Error('Internal configuration error: WebSocket server not available.');
    }

    // Define a promise wrapper for the callback-based sendRequest
    const result = await new Promise((resolve, reject) => {
      const success = wsServerInstance.remoteStopTransaction(chargePointId, activeTransaction.transactionId, (responsePayload) => {
        // This callback is executed when the charge point sends back a CallResult
        resolve(responsePayload); // Resolve the promise with the response payload
      });
      // If sendRequest itself fails immediately (e.g., station not connected)
      if (!success) {
         reject(new Error('Failed to send RemoteStopTransaction command (station likely disconnected)'));
      }
      // TODO: Add a timeout for the promise in case the station never responds?
    });

    if (result && result.status === 'Accepted') {
      logger.info('RemoteStopTransaction accepted by charge point', { chargePointId, transactionId: activeTransaction.transactionId });
      // The charge point should eventually send a StopTransaction.req
      // which will be handled elsewhere to finalize the transaction state.
      return { success: true };
    } else {
      logger.error('RemoteStopTransaction rejected or failed', { chargePointId, transactionId: activeTransaction.transactionId, result });
      return { success: false, message: `Charge point rejected stop command: ${result?.status || 'Unknown reason'}` };
    }

  } catch (error) {
    logger.error('Error during stopTransaction process', { chargePointId, connectorId, error: error.message });
    throw new Error(`Failed to initiate stop transaction: ${error.message}`);
  }
}

module.exports = {
  updateChargePoint,
  getChargePoint,
  getAllChargePoints,
  updateChargePointStatus,
  handleBootNotification,
  handleStatusNotification,
  handleHeartbeat,
  updateChargePointMeterValue,
  stopTransaction,
  initialize // Export the initialize function
}; 