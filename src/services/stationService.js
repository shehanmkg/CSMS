const { logger } = require('../utils/logger');

// In-memory storage for charge point data
const chargePoints = new Map();

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
    lastUpdated: new Date()
  };
  
  // Store updated data
  chargePoints.set(chargePointId, updatedData);
  
  logger.debug('Updated charge point data', { 
    chargePointId, 
    updatedFields: Object.keys(data) 
  });
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
  const { status, errorCode, info, timestamp } = statusData;
  
  updateChargePointStatus(chargePointId, status, {
    errorCode: errorCode || null,
    info: info || null,
    connectorId: statusData.connectorId,
    timestampFromCP: timestamp ? new Date(timestamp) : null
  });
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

module.exports = {
  updateChargePoint,
  getChargePoint,
  getAllChargePoints,
  updateChargePointStatus,
  handleBootNotification,
  handleStatusNotification,
  handleHeartbeat
}; 