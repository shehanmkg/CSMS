/**
 * Simple script to send a BootNotification message
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Command line arguments
const args = process.argv.slice(2);
const chargePointId = args[0] || 'CP001';
const vendor = args[1] || 'Test Vendor';
const model = args[2] || 'Test Model';

// Configuration
const config = {
  serverUrl: `ws://localhost:9220/${chargePointId}`,
  chargePointId: chargePointId,
  chargePointVendor: vendor,
  chargePointModel: model
};

console.log(`Sending BootNotification for ${chargePointId}...`);

// Create WebSocket connection
const ws = new WebSocket(config.serverUrl);

// Connection event handlers
ws.on('open', async () => {
  console.log(`Connected to ${config.serverUrl}`);
  
  // Send boot notification
  sendBootNotification();
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', JSON.stringify(message, null, 2));
  
  // If it's a response to our BootNotification, close the connection
  if (message[0] === 3) { // CALLRESULT
    console.log('BootNotification accepted. Interval:', message[2].interval);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Send BootNotification message
function sendBootNotification() {
  const messageId = uuidv4();
  const payload = {
    chargePointVendor: config.chargePointVendor,
    chargePointModel: config.chargePointModel,
    firmwareVersion: '1.0.0'
  };
  
  const message = [2, messageId, 'BootNotification', payload]; // 2 = CALL
  
  console.log('Sending BootNotification:', JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
} 