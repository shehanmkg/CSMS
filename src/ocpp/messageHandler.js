const { ocppLogger } = require('../utils/logger');

// OCPP Message Types
const CALL = 2;
const CALLRESULT = 3;
const CALLERROR = 4;

// OCPP Message Actions
const ACTIONS = {
  BOOT_NOTIFICATION: 'BootNotification',
  HEARTBEAT: 'Heartbeat',
  STATUS_NOTIFICATION: 'StatusNotification',
  AUTHORIZE: 'Authorize',
  START_TRANSACTION: 'StartTransaction',
  STOP_TRANSACTION: 'StopTransaction',
  METER_VALUES: 'MeterValues'
};

async function handleOCPPMessage(ws, message) {
  try {
    const parsedMessage = JSON.parse(message);
    
    // Log incoming message
    ocppLogger.debug('Received OCPP message:', {
      chargePointId: ws.chargePointId,
      message: parsedMessage
    });

    // Validate message structure
    if (!Array.isArray(parsedMessage) || parsedMessage.length < 3) {
      throw new Error('Invalid message format');
    }

    const [messageType, messageId, action, payload] = parsedMessage;

    // Basic message type handling
    switch (messageType) {
      case CALL:
        await handleCall(ws, messageId, action, payload);
        break;
      case CALLRESULT:
        await handleCallResult(ws, messageId, payload);
        break;
      case CALLERROR:
        await handleCallError(ws, messageId, payload);
        break;
      default:
        throw new Error('Invalid message type');
    }

  } catch (error) {
    ocppLogger.error('Error processing message:', {
      error: error.message,
      stack: error.stack,
      chargePointId: ws.chargePointId
    });
    
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify([CALLERROR, messageId || "", "GenericError", "Internal error", {}]));
    }
  }
}

async function handleCall(ws, messageId, action, payload) {
  ocppLogger.debug(`Handling ${action} request`, {
    chargePointId: ws.chargePointId,
    messageId,
    payload
  });

  let response;
  
  switch (action) {
    case ACTIONS.BOOT_NOTIFICATION:
      response = {
        status: "Accepted",
        currentTime: new Date().toISOString(),
        interval: 300
      };
      ocppLogger.info(`Charge Point ${ws.chargePointId} booted successfully`, {
        payload,
        response
      });
      break;

    case ACTIONS.HEARTBEAT:
      response = {
        currentTime: new Date().toISOString()
      };
      ocppLogger.debug(`Heartbeat received from ${ws.chargePointId}`);
      break;

    case ACTIONS.STATUS_NOTIFICATION:
      response = {};
      ocppLogger.info(`Status update from ${ws.chargePointId}:`, {
        status: payload.status,
        errorCode: payload.errorCode
      });
      break;

    default:
      ocppLogger.warn(`Unhandled action ${action} from ${ws.chargePointId}`);
      response = {};
  }

  // Send response
  const callResult = [CALLRESULT, messageId, response];
  ws.send(JSON.stringify(callResult));
}

async function handleCallResult(ws, messageId, payload) {
  ocppLogger.debug(`Received CallResult for message ${messageId}`, {
    chargePointId: ws.chargePointId,
    payload
  });
}

async function handleCallError(ws, messageId, payload) {
  ocppLogger.error(`Received CallError for message ${messageId}`, {
    chargePointId: ws.chargePointId,
    payload
  });
}

// Function to check connection status
function getConnectionStatus(ws) {
  return {
    isConnected: ws.readyState === ws.OPEN,
    lastPingTime: ws.lastPingTime,
    chargePointId: ws.chargePointId,
    uptime: ws.lastPingTime ? Date.now() - ws.lastPingTime : 0
  };
}

module.exports = { 
  handleOCPPMessage,
  getConnectionStatus,
  ACTIONS
}; 