/**
 * Simple script to set a connector status to Charging
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Command line arguments
const args = process.argv.slice(2);
const chargePointId = args[0] || 'CP001';
const connectorId = parseInt(args[1] || '1', 10);
const status = args[2] || 'Charging';

// Display usage if not enough arguments
if (args.length < 3) {
  console.log(`
Usage: node src/scripts/set-connector-status.js [chargePointID] [connectorID] [status]
Default values: CP001 1 Charging

Status can be one of: Available, Preparing, Charging, SuspendedEVSE, SuspendedEV, Finishing, Reserved, Unavailable, Faulted
  `);
}

// Configuration
const config = {
  serverUrl: `ws://localhost:9220/${chargePointId}`,
  chargePointId: chargePointId,
  connectorId: connectorId, 
  status: status
};

console.log(`Setting ${chargePointId} connector ${connectorId} status to ${status}...`);

// Create WebSocket connection
const ws = new WebSocket(config.serverUrl);

// Connection event handlers
ws.on('open', async () => {
  console.log(`Connected to ${config.serverUrl}`);
  
  // Send status notification
  sendStatusNotification();
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', JSON.stringify(message, null, 2));
  
  // If it's a response to our StatusNotification, close the connection
  if (message[0] === 3) { // CALLRESULT
    console.log('Status notification sent successfully!');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Send StatusNotification message
function sendStatusNotification() {
  const messageId = uuidv4();
  const payload = {
    connectorId: config.connectorId,
    status: config.status,
    errorCode: 'NoError',
    timestamp: new Date().toISOString()
  };
  
  const message = [2, messageId, 'StatusNotification', payload]; // 2 = CALL
  
  console.log('Sending StatusNotification:', JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
} 