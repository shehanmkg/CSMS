const { logger } = require('../../utils/logger');

/**
 * BootNotification handler
 * 
 * This handler processes BootNotification requests from charge points.
 * It returns a response with status and interval configuration.
 * 
 * @param {object} payload - The BootNotification payload
 * @param {string} chargePointId - The ID of the charge point
 * @returns {object} - The BootNotification response
 */
async function handleBootNotification(payload, chargePointId) {
  // Log the boot notification
  logger.info('BootNotification received', {
    chargePointId,
    vendor: payload.chargePointVendor,
    model: payload.chargePointModel,
    serialNumber: payload.chargePointSerialNumber
  });

  // Validate required fields
  if (!payload.chargePointVendor) {
    throw new Error('Missing required field: chargePointVendor');
  }

  if (!payload.chargePointModel) {
    throw new Error('Missing required field: chargePointModel');
  }

  // Additional fields that are optional but often provided
  const additionalInfo = {
    ...(payload.chargePointSerialNumber && { serialNumber: payload.chargePointSerialNumber }),
    ...(payload.firmwareVersion && { firmwareVersion: payload.firmwareVersion }),
    ...(payload.iccid && { iccid: payload.iccid }),
    ...(payload.imsi && { imsi: payload.imsi }),
    ...(payload.meterType && { meterType: payload.meterType }),
    ...(payload.meterSerialNumber && { meterSerialNumber: payload.meterSerialNumber })
  };

  if (Object.keys(additionalInfo).length > 0) {
    logger.debug('Additional boot info', {
      chargePointId,
      ...additionalInfo
    });
  }

  // In a real implementation, we'd check registration status in a database
  // For now, we'll accept all charge points
  
  // Get the current time in ISO format
  const currentTime = new Date().toISOString();
  
  // Return the response as per OCPP 1.6 spec
  return {
    status: 'Accepted', // 'Accepted', 'Pending', or 'Rejected'
    currentTime,
    interval: 300 // Heartbeat interval in seconds
  };
}

module.exports = handleBootNotification; 