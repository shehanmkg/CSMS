const { logger } = require('../utils/logger');

async function validateConnection(ws, req) {
  try {
    // Log raw request details
    logger.debug('Validating connection request', {
      url: req.url,
      headers: req.headers,
      remoteAddress: req.socket.remoteAddress
    });

    // Extract and validate URL parts
    const urlParts = req.url.split('/').filter(part => part);
    
    // URL should now be in format /{chargePointId}
    if (urlParts.length !== 1) {
      logger.warn('Invalid URL format', { 
        url: req.url,
        urlParts 
      });
      return false;
    }

    const chargePointId = urlParts[0];
    
    if (!chargePointId) {
      logger.warn('Connection attempt without charge point ID');
      return false;
    }

    // Validate protocol - being more lenient with the check
    const protocols = req.headers['sec-websocket-protocol'];
    if (!protocols) {
      logger.warn(`Missing WebSocket protocol for charge point ${chargePointId}`, {
        headers: req.headers
      });
      return false;
    }

    // Accept both 'ocpp1.6' and 'ocpp1.6.1' for compatibility
    const protocolList = protocols.split(',').map(p => p.trim().toLowerCase());
    const validProtocols = ['ocpp1.6', 'ocpp1.6.1'];
    const hasValidProtocol = protocolList.some(p => validProtocols.includes(p));

    if (!hasValidProtocol) {
      logger.warn(`Invalid protocol for charge point ${chargePointId}:`, {
        protocols: protocolList,
        validProtocols
      });
      return false;
    }

    // Log successful validation
    logger.debug('Connection validated successfully', {
      chargePointId,
      protocol: protocols,
      remoteAddress: req.socket.remoteAddress,
      url: req.url
    });

    return true;
  } catch (error) {
    logger.error('Error in connection validation:', {
      error: error.message,
      stack: error.stack,
      url: req.url
    });
    return false;
  }
}

module.exports = { validateConnection }; 