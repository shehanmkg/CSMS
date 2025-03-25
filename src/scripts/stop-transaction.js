/**
 * Simple script to stop a transaction
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Command line arguments
const args = process.argv.slice(2);
const chargePointId = args[0] || 'CP001';
const transactionId = parseInt(args[1] || '1', 10);
const idTag = args[2] || 'USER123';
const meterStop = parseInt(args[3] || '3000', 10);

// Display usage if not enough arguments
if (args.length < 2) {
  console.log(`
Usage: node src/scripts/stop-transaction.js [chargePointID] [transactionId] [idTag] [meterStop]
Default values: CP001 1 USER123 3000
  `);
}

// Configuration
const config = {
  serverUrl: `ws://localhost:9220/${chargePointId}`,
  chargePointId: chargePointId,
  transactionId: transactionId,
  idTag: idTag,
  meterStop: meterStop
};

console.log(`Stopping transaction ${transactionId} on ${chargePointId} with meterStop ${meterStop}...`);

// Create WebSocket connection
const ws = new WebSocket(config.serverUrl);

// Connection event handlers
ws.on('open', async () => {
  console.log(`Connected to ${config.serverUrl}`);
  
  // Send stop transaction request
  sendStopTransaction();
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', JSON.stringify(message, null, 2));
  
  // Check message type and action
  if (message[0] === 3) { // CALLRESULT
    // This is a response to StopTransaction
    console.log('Transaction stopped successfully!');
    console.log(`Status: ${message[2].idTagInfo?.status || 'Unknown'}`);
    
    // Send status notification for Finishing state
    setTimeout(() => {
      sendStatusNotification('Finishing');
    }, 500);
  } else if (message[0] === 4) { // CALLERROR
    console.error('Error stopping transaction:', message[3]);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Send StopTransaction message
function sendStopTransaction() {
  const messageId = uuidv4();
  const payload = {
    transactionId: config.transactionId,
    idTag: config.idTag,
    meterStop: config.meterStop,
    timestamp: new Date().toISOString()
  };
  
  const message = [2, messageId, 'StopTransaction', payload]; // 2 = CALL
  
  console.log('Sending StopTransaction:', JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
}

// Send StatusNotification message
function sendStatusNotification(status) {
  const messageId = uuidv4();
  const payload = {
    connectorId: 1, // Assuming connector 1
    status: status,
    errorCode: 'NoError',
    timestamp: new Date().toISOString()
  };
  
  const message = [2, messageId, 'StatusNotification', payload]; // 2 = CALL
  
  console.log('Sending StatusNotification:', JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
  
  // Wait for status to update, then set to Available
  setTimeout(() => {
    if (status === 'Finishing') {
      sendStatusNotification('Available');
    } else {
      ws.close();
    }
  }, 1000);
} 