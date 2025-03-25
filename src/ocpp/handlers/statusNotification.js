/**
 * OCPP StatusNotification Message Handler
 * Implements the StatusNotification operation as specified in OCPP 1.6J
 * 
 * StatusNotification is sent by a Charge Point to the Central System when there
 * is a change in a connector's status or an error condition occurs.
 */

const { logger } = require('../../utils/logger');

// Valid status values as per OCPP 1.6 spec
const VALID_STATUS_VALUES = [
  'Available',
  'Preparing',
  'Charging',
  'SuspendedEVSE',
  'SuspendedEV',
  'Finishing',
  'Reserved',
  'Unavailable',
  'Faulted'
];

// Valid error code values as per OCPP 1.6 spec
const VALID_ERROR_CODES = [
  'ConnectorLockFailure',
  'EVCommunicationError',
  'GroundFailure',
  'HighTemperature',
  'InternalError',
  'LocalListConflict',
  'NoError',
  'OtherError',
  'OverCurrentFailure',
  'PowerMeterFailure',
  'PowerSwitchFailure',
  'ReaderFailure',
  'ResetFailure',
  'UnderVoltage',
  'OverVoltage',
  'WeakSignal'
];

/**
 * StatusNotification handler
 * 
 * This handler processes StatusNotification requests from charge points,
 * which report changes in connector status or error conditions.
 * 
 * @param {object} payload - The StatusNotification payload
 * @param {string} chargePointId - The ID of the charge point
 * @returns {object} - Empty response object as per OCPP spec
 */
async function handleStatusNotification(payload, chargePointId) {
  logger.info('StatusNotification received', {
    chargePointId,
    connectorId: payload.connectorId,
    status: payload.status,
    errorCode: payload.errorCode
  });
  
  // Validate required fields
  if (payload.connectorId === undefined) {
    throw new Error('Missing required field: connectorId');
  }
  
  if (!payload.status) {
    throw new Error('Missing required field: status');
  }
  
  if (!payload.errorCode) {
    throw new Error('Missing required field: errorCode');
  }
  
  // Validate status is one of the allowed values
  if (!VALID_STATUS_VALUES.includes(payload.status)) {
    throw new Error(`Invalid status value: ${payload.status}`);
  }
  
  // Validate errorCode is one of the allowed values
  if (!VALID_ERROR_CODES.includes(payload.errorCode)) {
    throw new Error(`Invalid errorCode value: ${payload.errorCode}`);
  }
  
  // Log additional information if available
  if (payload.info || payload.vendorId || payload.vendorErrorCode) {
    logger.debug('Additional status information', {
      chargePointId,
      connectorId: payload.connectorId,
      info: payload.info,
      vendorId: payload.vendorId,
      vendorErrorCode: payload.vendorErrorCode
    });
  }
  
  // StatusNotification.conf has no fields in OCPP 1.6J
  return {};
}

module.exports = handleStatusNotification; 