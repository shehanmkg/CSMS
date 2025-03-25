const { logger } = require('../../utils/logger');
const authService = require('../../services/authService');

/**
 * Authorize handler
 * 
 * This handler processes authorization requests from charge points to validate
 * if an ID token (RFID card, app token, etc.) is valid for charging.
 * 
 * @param {object} payload - The Authorize request payload
 * @param {string} chargePointId - The ID of the charge point
 * @returns {object} - The Authorize response with authorization status
 */
async function handleAuthorize(payload, chargePointId) {
  logger.info('Authorize request received', {
    chargePointId,
    idTag: payload.idTag
  });

  // Validate required fields
  if (!payload.idTag) {
    throw new Error('Missing required field: idTag');
  }

  // Validate token and start authorization if accepted
  const authorizationStatus = authService.startAuthorization(payload.idTag, chargePointId);
  
  logger.debug('Authorization result', {
    chargePointId,
    idTag: payload.idTag,
    status: authorizationStatus.status
  });

  // Return the response as per OCPP 1.6 spec
  return {
    idTagInfo: authorizationStatus
  };
}

/**
 * Validate an ID tag against a set of rules
 * 
 * @param {string} idTag - The ID tag to validate
 * @returns {object} - Authorization status info
 */
function validateIdTag(idTag) {
  // In a production environment, this would check against a database
  // For testing purposes, we'll use hardcoded values
  
  // Test tags for demo purposes
  const testTags = {
    'valid123': 'Accepted',
    'expired456': 'Expired',
    'blocked789': 'Blocked',
    'invalid000': 'Invalid'
  };

  // Allow "TEST" as a valid tag, plus a few specific test cases
  if (idTag === 'TEST' || idTag === 'valid123') {
    return {
      status: 'Accepted',
      expiryDate: new Date(Date.now() + 86400000).toISOString() // Valid for 24 hours
    };
  } else if (idTag === 'expired456') {
    return {
      status: 'Expired',
      expiryDate: new Date(Date.now() - 86400000).toISOString() // Expired yesterday
    };
  } else if (idTag === 'blocked789') {
    return {
      status: 'Blocked'
    };
  } else if (testTags[idTag]) {
    return {
      status: testTags[idTag]
    };
  }
  
  // Default fallback behavior - in development mode, accept unknown tags
  // In production, this would be 'Invalid' by default
  return {
    status: process.env.NODE_ENV === 'production' ? 'Invalid' : 'Accepted'
  };
}

module.exports = handleAuthorize; 