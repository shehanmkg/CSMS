/**
 * Test script for simulating a charging session
 * This script will send OCPP messages to simulate a complete charging flow
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Configuration
const config = {
  serverUrl: 'ws://localhost:9220/CP001', // Change this to match your server
  chargePointId: 'CP001',
  connectorId: 1,
  idTag: 'TEST1234',
  meterStart: 1000
};

// Create WebSocket connection
const ws = new WebSocket(config.serverUrl);

// Message queue for ordered execution
const messageQueue = [];
let processing = false;

// Connection event handlers
ws.on('open', async () => {
  console.log(`Connected to ${config.serverUrl}`);
  
  // Start the test flow
  sendBootNotification();
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received:', JSON.stringify(message, null, 2));
  
  // Process response
  if (message[0] === 3) { // CALLRESULT
    const messageId = message[1];
    const response = message[2];
    console.log(`Response for message ${messageId}:`, response);
    
    // Process next message in queue
    processNextMessage();
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('WebSocket connection closed');
});

// Helper function to send OCPP messages
function sendOcppMessage(action, payload) {
  const messageId = uuidv4();
  const message = [2, messageId, action, payload]; // 2 = CALL
  
  return new Promise((resolve) => {
    console.log(`Sending ${action}:`, JSON.stringify(payload, null, 2));
    ws.send(JSON.stringify(message));
    
    // Add callback to be executed after response is received
    messageQueue.push(() => {
      console.log(`Completed ${action}`);
      resolve();
    });
    
    // If this is the first message, start processing
    if (!processing) {
      processNextMessage();
    }
  });
}

// Process next message in queue
function processNextMessage() {
  if (messageQueue.length > 0) {
    processing = true;
    const nextCallback = messageQueue.shift();
    setTimeout(() => {
      nextCallback();
    }, 500); // Small delay between messages
  } else {
    processing = false;
  }
}

// OCPP Action: Boot Notification
async function sendBootNotification() {
  await sendOcppMessage('BootNotification', {
    chargePointVendor: 'Test Vendor',
    chargePointModel: 'Test Model'
  });
  
  // Continue with status notifications
  await sendStatusNotificationAvailable();
}

// OCPP Action: Status Notification - Available
async function sendStatusNotificationAvailable() {
  await sendOcppMessage('StatusNotification', {
    connectorId: config.connectorId,
    status: 'Available',
    errorCode: 'NoError',
    timestamp: new Date().toISOString()
  });
  
  // Continue with status notification - Preparing
  await sendStatusNotificationPreparing();
}

// OCPP Action: Status Notification - Preparing
async function sendStatusNotificationPreparing() {
  await sendOcppMessage('StatusNotification', {
    connectorId: config.connectorId,
    status: 'Preparing',
    errorCode: 'NoError',
    timestamp: new Date().toISOString()
  });
  
  // Start a transaction
  await startTransaction();
}

// OCPP Action: Start Transaction
async function startTransaction() {
  await sendOcppMessage('StartTransaction', {
    connectorId: config.connectorId,
    idTag: config.idTag,
    meterStart: config.meterStart,
    timestamp: new Date().toISOString()
  });
  
  // Update status to Charging
  await sendStatusNotificationCharging();
}

// OCPP Action: Status Notification - Charging
async function sendStatusNotificationCharging() {
  await sendOcppMessage('StatusNotification', {
    connectorId: config.connectorId,
    status: 'Charging',
    errorCode: 'NoError',
    timestamp: new Date().toISOString()
  });
  
  // Send meter values
  await sendMeterValues();
}

// OCPP Action: Meter Values
async function sendMeterValues() {
  // Create meter values (energy reading increasing by 100 Wh)
  const meterValue = config.meterStart + 100;
  
  await sendOcppMessage('MeterValues', {
    connectorId: config.connectorId,
    transactionId: 1, // Assuming transaction ID 1
    meterValue: [{
      timestamp: new Date().toISOString(),
      sampledValue: [{
        value: meterValue,
        context: 'Sample.Periodic',
        measurand: 'Energy.Active.Import.Register',
        unit: 'Wh'
      }]
    }]
  });
  
  console.log('Test charging flow completed successfully!');
}

console.log('Starting test charging flow...'); 