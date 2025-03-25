/**
 * OCPP Message Handlers Index
 * Consolidates all OCPP message handlers for easy import
 */

const heartbeatHandler = require('./heartbeat');
const statusNotificationHandler = require('./statusNotification');
const bootNotificationHandler = require('./bootNotification');
const authorizeHandler = require('./authorize');
const startTransactionHandler = require('./startTransaction');
const stopTransactionHandler = require('./stopTransaction');
const meterValuesHandler = require('./meterValues');
const { logger } = require('../../utils/logger');

// OCPP action names
const ACTIONS = {
  BOOT_NOTIFICATION: 'BootNotification',
  HEARTBEAT: 'Heartbeat',
  STATUS_NOTIFICATION: 'StatusNotification',
  AUTHORIZE: 'Authorize',
  // Other OCPP actions to be implemented later
  START_TRANSACTION: 'StartTransaction',
  STOP_TRANSACTION: 'StopTransaction',
  METER_VALUES: 'MeterValues',
  DATA_TRANSFER: 'DataTransfer'
};

// Map of action names to handler functions
const actionHandlers = new Map([
  [ACTIONS.BOOT_NOTIFICATION, bootNotificationHandler],
  [ACTIONS.HEARTBEAT, heartbeatHandler],
  [ACTIONS.STATUS_NOTIFICATION, statusNotificationHandler],
  [ACTIONS.AUTHORIZE, authorizeHandler],
  [ACTIONS.START_TRANSACTION, startTransactionHandler],
  [ACTIONS.STOP_TRANSACTION, stopTransactionHandler],
  [ACTIONS.METER_VALUES, meterValuesHandler],
  // Add placeholder handlers for unimplemented actions
  [ACTIONS.DATA_TRANSFER, notImplementedHandler('DataTransfer')]
]);

/**
 * Get the handler function for a specific OCPP action
 * 
 * @param {string} action - The OCPP action name
 * @returns {Function|null} The handler function or null if not found
 */
function getHandlerForAction(action) {
  if (!actionHandlers.has(action)) {
    logger.warn(`No handler found for action: ${action}`);
    return null;
  }
  
  return actionHandlers.get(action);
}

/**
 * Create a placeholder handler for not yet implemented OCPP actions
 * 
 * @param {string} actionName - The name of the action
 * @returns {Function} A handler function that logs a warning and returns an empty response
 */
function notImplementedHandler(actionName) {
  return async (payload, chargePointId) => {
    logger.warn(`Handler for ${actionName} not yet fully implemented`, {
      chargePointId,
      payload
    });
    
    // Return empty object as a default response
    return {};
  };
}

module.exports = {
  getHandlerForAction,
  ACTIONS
}; 