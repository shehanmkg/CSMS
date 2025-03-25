/**
 * Simple script to start a transaction on a connector
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Command line arguments
const args = process.argv.slice(2);
const chargePointId = args[0] || 'CP001';
const connectorId = parseInt(args[1] || '1', 10);
const idTag = args[2] || 'TEST1234';
const meterStart = parseInt(args[3] || '0', 10);

// Display usage if not enough arguments
if (args.length < 3) {
  console.log(`
Usage: node src/scripts/start-transaction.js [chargePointID] [connectorID] [idTag] [meterStart]
Default values: CP001 1 TEST1234 0
  `);
}

// Configuration
const config = {
  serverUrl: `ws://localhost:9220/${chargePointId}`,
  chargePointId: chargePointId,
  connectorId: connectorId,
  idTag: idTag,
  meterStart: meterStart
};

console.log(`Starting transaction on ${chargePointId} connector ${connectorId} with idTag ${idTag}...`);

// Create WebSocket connection
const ws = new WebSocket(config.serverUrl);

// Connection event handlers
ws.on('open', async () => {
  console.log(`Connected to ${config.serverUrl}`);
  
  // Send start transaction request
  sendStartTransaction();
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', JSON.stringify(message, null, 2));
  
  // Check message type and action
  if (message[0] === 3) { // CALLRESULT
    const messageId = message[1];
    
    if (message[2].transactionId !== undefined) {
      // This is a response to StartTransaction
      console.log('Transaction started successfully!');
      console.log(`Transaction ID: ${message[2].transactionId}`);
      console.log(`Authorization Status: ${message[2].idTagInfo?.status || 'Unknown'}`);
      
      // Don't close yet - wait a moment to send status notification
      setTimeout(() => {
        sendStatusNotification('Charging');
      }, 1000);
    } else {
      // This is a response to StatusNotification
      console.log('Status notification sent successfully!');
      
      // Close connection
      setTimeout(() => {
        ws.close();
      }, 500);
    }
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Send StartTransaction message
function sendStartTransaction() {
  const messageId = uuidv4();
  const payload = {
    connectorId: config.connectorId,
    idTag: config.idTag,
    meterStart: config.meterStart,
    timestamp: new Date().toISOString()
  };
  
  const message = [2, messageId, 'StartTransaction', payload]; // 2 = CALL
  
  console.log('Sending StartTransaction:', JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
}

// Send StatusNotification message
function sendStatusNotification(status) {
  const messageId = uuidv4();
  const payload = {
    connectorId: config.connectorId,
    status: status,
    errorCode: 'NoError',
    timestamp: new Date().toISOString()
  };
  
  const message = [2, messageId, 'StatusNotification', payload]; // 2 = CALL
  
  console.log('Sending StatusNotification:', JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
  
  // Close after sending status
  setTimeout(() => {
    ws.close();
  }, 1000);
} 