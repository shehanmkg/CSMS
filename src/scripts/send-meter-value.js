/**
 * Script to send meter values for a transaction
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Command line arguments
const args = process.argv.slice(2);
const chargePointId = args[0] || 'CP001';
const connectorId = parseInt(args[1] || '1', 10);
const transactionId = parseInt(args[2] || '1', 10);
const meterValue = parseInt(args[3] || '1000', 10);

// Display usage if not enough arguments
if (args.length < 4) {
  console.log(`
Usage: node src/scripts/send-meter-value.js [chargePointID] [connectorID] [transactionId] [meterValue]
Default values: CP001 1 1 1000
  `);
}

// Configuration
const config = {
  serverUrl: `ws://localhost:9220/${chargePointId}`,
  chargePointId: chargePointId,
  connectorId: connectorId,
  transactionId: transactionId,
  meterValue: meterValue
};

console.log(`Sending meter value ${meterValue} for ${chargePointId} connector ${connectorId} transaction ${transactionId}...`);

// Create WebSocket connection
const ws = new WebSocket(config.serverUrl);

// Connection event handlers
ws.on('open', async () => {
  console.log(`Connected to ${config.serverUrl}`);
  
  // Send meter values
  sendMeterValues();
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', JSON.stringify(message, null, 2));
  
  // If it's a response to our MeterValues, close the connection
  if (message[0] === 3) { // CALLRESULT
    console.log('Meter values sent successfully!');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Send MeterValues message
function sendMeterValues() {
  const messageId = uuidv4();
  const payload = {
    connectorId: config.connectorId,
    transactionId: config.transactionId,
    meterValue: [{
      timestamp: new Date().toISOString(),
      sampledValue: [{
        value: config.meterValue,
        context: 'Sample.Periodic',
        measurand: 'Energy.Active.Import.Register',
        unit: 'Wh'
      }]
    }]
  };
  
  const message = [2, messageId, 'MeterValues', payload]; // 2 = CALL
  
  console.log('Sending MeterValues:', JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
} 