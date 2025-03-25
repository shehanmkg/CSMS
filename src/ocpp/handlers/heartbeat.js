/**
 * OCPP Heartbeat Message Handler
 * Implements the Heartbeat operation as specified in OCPP 1.6J
 */

const { logger } = require('../../utils/logger');
const { validateOcppMessage, ACTIONS } = require('../schemas');

/**
 * Heartbeat handler
 * 
 * This handler processes Heartbeat requests from charge points.
 * It returns the current time to help charge points synchronize their clocks.
 * 
 * @param {object} payload - The Heartbeat request payload (empty object)
 * @param {string} chargePointId - The ID of the charge point
 * @returns {object} - The Heartbeat response with current time
 */
async function handleHeartbeat(payload, chargePointId) {
  logger.info('Heartbeat received', { chargePointId });
  
  // Get the current time in ISO format
  const currentTime = new Date().toISOString();
  
  // Return the response as per OCPP 1.6 spec
  return {
    currentTime
  };
}

module.exports = handleHeartbeat; 