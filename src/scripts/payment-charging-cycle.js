/**
 * Payment-based charging cycle demo script
 * 
 * This script demonstrates a complete charging cycle with payment integration:
 * 1. BootNotification
 * 2. StatusNotification (Available)
 * 3. StatusNotification (Preparing) - Car connected, awaiting payment
 * 4. Wait for payment to be processed through dashboard
 * 5. Receive RemoteStartTransaction command
 * 6. StatusNotification (Charging)
 * 7. MeterValues (multiple) - Send energy consumption while charging
 * 8. StopTransaction - End charging
 * 9. StatusNotification (Finishing) - Completing the transaction
 * 10. StatusNotification (Available) - Ready for the next session
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const { setTimeout } = require('timers/promises');

// Command line arguments
const args = process.argv.slice(2);
const chargePointId = args[0] || 'CP001';
const connectorId = parseInt(args[1] || '1', 10);
const durationSeconds = parseInt(args[2] || '30', 10); // Duration of charging session in seconds

// Configuration
const config = {
  serverUrl: `ws://localhost:9220/${chargePointId}`,
  chargePointId,
  connectorId,
  idTag: null, // Will be set when RemoteStartTransaction is received
  meterStart: 1000,
  meterStop: 0, // Will be calculated based on duration and consumption rate
  durationSeconds,
  meterInterval: 5, // Send meter values every 5 seconds
  consumptionRate: 22000 / 3600, // Wh per second (22kW charger)
  transactionId: null, // Will be set after transaction start
  paymentReceived: false
};

console.log(`Starting payment-based charging cycle demo for ${chargePointId}...`);
console.log(`Charging duration: ${config.durationSeconds} seconds`);

// Create WebSocket connection
let ws = null;
let connected = false;
let stepIndex = 0;
let startTime = null;
let currentMeterValue = config.meterStart;
let meterValueInterval = null;

// Demo steps
const steps = [
  { name: 'Boot Notification', action: sendBootNotification },
  { name: 'Status: Available', action: () => sendStatusNotification('Available') },
  { name: 'Status: Preparing', action: () => sendStatusNotification('Preparing') },
  { name: 'Wait for payment', action: waitForPayment },
  { name: 'Start Transaction', action: startTransaction },
  { name: 'Status: Charging', action: () => sendStatusNotification('Charging') },
  { name: 'Send Meter Values', action: startSendingMeterValues },
  { name: 'Wait for charging to complete', action: waitForChargingToComplete },
  { name: 'Stop Transaction', action: stopTransaction },
  { name: 'Status: Finishing', action: () => sendStatusNotification('Finishing') },
  { name: 'Status: Available', action: () => sendStatusNotification('Available') },
  { name: 'Demo Completed', action: completeDemo }
];

/**
 * Start the demo
 */
async function startDemo() {
  console.log('\n----- Beginning payment-based charging session demo -----\n');
  startTime = Date.now();
  
  // Connect to the server
  connectToServer();
}

/**
 * Connect to the WebSocket server
 */
function connectToServer() {
  ws = new WebSocket(config.serverUrl);
  
  ws.on('open', async () => {
    console.log(`Connected to ${config.serverUrl}`);
    connected = true;
    // Start the first step
    executeNextStep();
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    console.log('<< Received:', JSON.stringify(message, null, 2));
    
    // Process response
    if (message[0] === 3) { // CALLRESULT
      // Extract transaction ID from StartTransaction response
      if (message[2].transactionId !== undefined) {
        config.transactionId = message[2].transactionId;
        console.log(`Transaction ID: ${config.transactionId}`);
      }
      
      // Move to next step for this type of response
      executeNextStep();
    } else if (message[0] === 4) { // CALLERROR
      console.error('Error:', message[3]);
      executeNextStep();
    } else if (message[0] === 2) { // CALL (from Central System)
      handleIncomingCall(message);
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    reconnect();
  });
  
  ws.on('close', () => {
    if (connected) {
      console.log('WebSocket connection closed');
      connected = false;
      // Reconnect if we're not done
      if (stepIndex < steps.length - 1) {
        reconnect();
      }
    }
  });
}

/**
 * Handle incoming CALL from Central System
 */
function handleIncomingCall(message) {
  const [messageType, messageId, action, payload] = message;
  
  console.log(`Received ${action} from central system`);
  
  if (action === 'RemoteStartTransaction') {
    // Extract idTag from RemoteStartTransaction
    config.idTag = payload.idTag;
    console.log(`Received payment and RemoteStartTransaction with idTag: ${config.idTag}`);
    
    // Send CallResult response
    sendCallResult(messageId, { status: 'Accepted' });
    
    // Set payment received flag
    config.paymentReceived = true;
  } else {
    // Send default accepted response for other commands
    sendCallResult(messageId, { status: 'Accepted' });
  }
}

/**
 * Send CallResult response
 */
function sendCallResult(messageId, payload) {
  if (!connected || !ws) {
    console.log('Not connected, reconnecting...');
    reconnect();
    return;
  }
  
  const message = [3, messageId, payload]; // 3 = CALLRESULT
  
  console.log(`>> Sending CallResult:`, JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
}

/**
 * Reconnect to the server
 */
async function reconnect() {
  console.log('Reconnecting to server...');
  await setTimeout(1000);
  connectToServer();
}

/**
 * Execute the next step in the demo
 */
function executeNextStep() {
  if (stepIndex < steps.length) {
    const step = steps[stepIndex];
    console.log(`\n[Step ${stepIndex + 1}/${steps.length}] ${step.name}`);
    
    stepIndex++;
    step.action();
  }
}

/**
 * Helper function to send OCPP messages
 */
function sendOcppMessage(action, payload) {
  if (!connected || !ws) {
    console.log('Not connected, reconnecting...');
    reconnect();
    return;
  }
  
  const messageId = uuidv4();
  const message = [2, messageId, action, payload]; // 2 = CALL
  
  console.log(`>> Sending ${action}:`, JSON.stringify(payload, null, 2));
  ws.send(JSON.stringify(message));
}

/**
 * OCPP Action: Boot Notification
 */
function sendBootNotification() {
  sendOcppMessage('BootNotification', {
    chargePointVendor: 'Demo Vendor',
    chargePointModel: 'Demo Model',
    firmwareVersion: '1.0.0'
  });
}

/**
 * OCPP Action: Status Notification
 */
function sendStatusNotification(status) {
  sendOcppMessage('StatusNotification', {
    connectorId: config.connectorId,
    status: status,
    errorCode: 'NoError',
    timestamp: new Date().toISOString()
  });
}

/**
 * Wait for payment to be processed through the dashboard
 */
async function waitForPayment() {
  console.log('Waiting for payment to be processed through the dashboard...');
  console.log('(Go to the dashboard and complete the payment)');
  
  // Check payment status every second
  while (!config.paymentReceived) {
    await setTimeout(1000);
  }
  
  console.log('Payment received! Proceeding with charging...');
  executeNextStep();
}

/**
 * OCPP Action: Start Transaction
 */
function startTransaction() {
  if (!config.idTag) {
    console.error('No idTag received from RemoteStartTransaction. Cannot start transaction.');
    return;
  }
  
  sendOcppMessage('StartTransaction', {
    connectorId: config.connectorId,
    idTag: config.idTag,
    meterStart: config.meterStart,
    timestamp: new Date().toISOString()
  });
}

/**
 * Start sending meter values periodically
 */
function startSendingMeterValues() {
  console.log(`Sending meter values every ${config.meterInterval} seconds...`);
  
  // Send the first meter value immediately
  sendMeterValue();
  
  // Setup interval for subsequent meter values
  meterValueInterval = setInterval(sendMeterValue, config.meterInterval * 1000);
  
  // Move to next step
  executeNextStep();
}

/**
 * OCPP Action: Meter Values
 */
function sendMeterValue() {
  // Calculate current meter value based on consumption rate and elapsed time
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  currentMeterValue = Math.floor(config.meterStart + (elapsedSeconds * config.consumptionRate));
  
  // Calculate other metrics
  const currentPower = 22000; // 22kW in Watts
  const voltage = 400; // 400V for 3-phase charging
  const current = Math.round(currentPower / voltage * 10) / 10; // Amperes with 1 decimal place
  
  sendOcppMessage('MeterValues', {
    connectorId: config.connectorId,
    transactionId: config.transactionId,
    meterValue: [{
      timestamp: new Date().toISOString(),
      sampledValue: [
        {
          value: currentMeterValue,
          context: 'Sample.Periodic',
          measurand: 'Energy.Active.Import.Register',
          unit: 'Wh'
        },
        {
          value: currentPower,
          context: 'Sample.Periodic',
          measurand: 'Power.Active.Import',
          unit: 'W'
        },
        {
          value: voltage,
          context: 'Sample.Periodic',
          measurand: 'Voltage',
          unit: 'V'
        },
        {
          value: current,
          context: 'Sample.Periodic',
          measurand: 'Current.Import',
          unit: 'A'
        }
      ]
    }]
  });
}

/**
 * Wait for the charging duration to complete
 */
async function waitForChargingToComplete() {
  console.log(`Charging for ${config.durationSeconds} seconds...`);
  await setTimeout(config.durationSeconds * 1000);
  executeNextStep();
}

/**
 * OCPP Action: Stop Transaction
 */
function stopTransaction() {
  // Clear the meter value interval
  if (meterValueInterval) {
    clearInterval(meterValueInterval);
    meterValueInterval = null;
  }
  
  // Calculate final meter value
  config.meterStop = currentMeterValue;
  
  sendOcppMessage('StopTransaction', {
    transactionId: config.transactionId,
    idTag: config.idTag,
    meterStop: config.meterStop,
    timestamp: new Date().toISOString()
  });
}

/**
 * Complete the demo
 */
function completeDemo() {
  console.log('\n----- Payment-based charging session demo completed -----');
  console.log(`Total energy used: ${config.meterStop - config.meterStart} Wh`);
  console.log(`Total duration: ${Math.floor((Date.now() - startTime) / 1000)} seconds`);
  
  if (ws && connected) {
    ws.close();
  }
  
  // Exit the process after a short delay
  setTimeout(() => process.exit(0), 1000);
}

// Start the demo
startDemo(); 