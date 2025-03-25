const WebSocket = require('ws');
const readline = require('readline');

// Configuration
const CHARGE_POINT_ID = 'TEST_CLIENT_001';
const SERVER_URL = `ws://localhost:9220/${CHARGE_POINT_ID}`;
const PROTOCOL = 'ocpp1.6';

// Create a readline interface for console input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Message types
const MESSAGE_TYPE = {
  CALL: 2,
  CALLRESULT: 3,
  CALLERROR: 4
};

// Connect to server
console.log(`Connecting to ${SERVER_URL} with protocol ${PROTOCOL}...`);
const ws = new WebSocket(SERVER_URL, [PROTOCOL]);

// Track messages sent to associate responses
const pendingMessages = new Map();
let messageIdCounter = 1;

// Helper to generate unique message IDs
function getMessageId() {
  return (messageIdCounter++).toString();
}

// Connection opened event
ws.on('open', () => {
  console.log('Connection established!');
  console.log(`Protocol used: ${ws.protocol}`);
  
  // Send BootNotification immediately
  sendBootNotification();
  
  // Start CLI
  mainMenu();
});

// Message received event
ws.on('message', (message) => {
  console.log('\nReceived message:', message.toString());
  try {
    const parsedMessage = JSON.parse(message);
    
    if (parsedMessage[0] === MESSAGE_TYPE.CALLRESULT) {
      const messageId = parsedMessage[1];
      const payload = parsedMessage[2];
      
      // Check if we have a pending message with this ID
      const pendingMessage = pendingMessages.get(messageId);
      if (pendingMessage) {
        console.log(`Response for ${pendingMessage.action}:`, payload);
        pendingMessages.delete(messageId);
      }
    }
    
    // After processing the message, show the menu again
    mainMenu();
  } catch (error) {
    console.error('Error processing message:', error);
    mainMenu();
  }
});

// Error event
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Connection closed event
ws.on('close', (code, reason) => {
  console.log(`Connection closed: ${code} - ${reason}`);
  rl.close();
  process.exit(0);
});

// Main menu
function mainMenu() {
  console.log('\n=== OCPP Test Client ===');
  console.log('1. Send Heartbeat');
  console.log('2. Send StatusNotification (Available)');
  console.log('3. Send StatusNotification (Charging)');
  console.log('4. Send StatusNotification (Faulted)');
  console.log('5. Send BootNotification');
  console.log('0. Exit');
  
  rl.question('Select an option: ', (answer) => {
    switch (answer) {
      case '1':
        sendHeartbeat();
        break;
      case '2':
        sendStatusNotification('Available');
        break;
      case '3':
        sendStatusNotification('Charging');
        break;
      case '4':
        sendStatusNotification('Faulted', 'HighTemperature');
        break;
      case '5':
        sendBootNotification();
        break;
      case '0':
        console.log('Exiting...');
        ws.close();
        rl.close();
        break;
      default:
        console.log('Invalid option');
        mainMenu();
    }
  });
}

// Send BootNotification
function sendBootNotification() {
  const messageId = getMessageId();
  const action = 'BootNotification';
  const payload = {
    chargePointVendor: 'Test Vendor',
    chargePointModel: 'Test Model',
    chargePointSerialNumber: 'SN123456',
    firmwareVersion: '1.0.0'
  };
  
  sendOcppMessage(messageId, action, payload);
}

// Send Heartbeat
function sendHeartbeat() {
  const messageId = getMessageId();
  const action = 'Heartbeat';
  const payload = {}; // Heartbeat has no payload
  
  sendOcppMessage(messageId, action, payload);
}

// Send StatusNotification
function sendStatusNotification(status, errorCode = 'NoError') {
  const messageId = getMessageId();
  const action = 'StatusNotification';
  const payload = {
    connectorId: 1,
    errorCode,
    status,
    timestamp: new Date().toISOString(),
    info: `Test ${status} notification`
  };
  
  sendOcppMessage(messageId, action, payload);
}

// Generic function to send OCPP messages
function sendOcppMessage(messageId, action, payload) {
  const message = [MESSAGE_TYPE.CALL, messageId, action, payload];
  console.log(`Sending ${action}:`, payload);
  
  // Store message to track responses
  pendingMessages.set(messageId, {
    action,
    payload,
    timestamp: new Date()
  });
  
  ws.send(JSON.stringify(message));
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nExiting gracefully...');
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  rl.close();
  process.exit(0);
}); 